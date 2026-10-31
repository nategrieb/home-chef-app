import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabase-server';
import { FOOD_COLUMNS, type Food } from '../../../../lib/nutrition';
import { rankByQuery, toFoodRow, usdaSearch } from '../../../../lib/usda';

export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ foods: [] });

  // Every word must appear in the name, in any order. Strip characters with meaning in PostgREST/LIKE.
  const terms = q.toLowerCase().split(/\s+/).map((t) => t.replace(/[%_,()*\\]/g, '')).filter(Boolean).slice(0, 5);
  if (terms.length === 0) return NextResponse.json({ foods: [] });

  const chef = supabase.schema('chef');

  // 1) Your own custom foods and everything already cached.
  let local = chef.from('foods').select(FOOD_COLUMNS).limit(15);
  for (const term of terms) local = local.ilike('name', `%${term}%`);
  const { data: localFoods, error: localError } = await local;
  if (localError) {
    return NextResponse.json({ foods: [], error: 'Food tables are not set up yet. Run add-calorie-tracking.sql.' }, { status: 500 });
  }

  // Custom foods first, then by shorter (plainer) name.
  const foods: Food[] = [...((localFoods ?? []) as Food[])].sort(
    (a, b) => Number(b.source === 'custom') - Number(a.source === 'custom') || a.name.length - b.name.length
  );

  // 2) USDA for anything not cached yet. Generic foods first, then branded products.
  let usda: 'ok' | 'rate_limited' | 'unavailable' | 'skipped' = 'skipped';
  if (q.length >= 3) {
    const apiKey = process.env.USDA_API_KEY ?? 'DEMO_KEY';
    const [generic, branded] = await Promise.all([
      usdaSearch(q, 'Foundation,SR Legacy', 30, apiKey),
      usdaSearch(q, 'Branded', 8, apiKey),
    ]);

    if (generic === 'rate_limited' || branded === 'rate_limited') usda = 'rate_limited';
    else if (generic === null && branded === null) usda = 'unavailable';
    else {
      usda = 'ok';
      const rows = [
        ...rankByQuery(Array.isArray(generic) ? generic : [], terms).slice(0, 8),
        ...(Array.isArray(branded) ? branded : []),
      ].map(toFoodRow);

      if (rows.length > 0) {
        // Cache what we found; then read it back to get row ids (existing rows are left as they are).
        await chef.from('foods').upsert(rows, { onConflict: 'source,source_id', ignoreDuplicates: true });
        const { data: cached } = await chef
          .from('foods')
          .select(FOOD_COLUMNS + ', source_id')
          .eq('source', 'usda')
          .in('source_id', rows.map((r) => r.source_id));

        const order = new Map(rows.map((r, i) => [r.source_id, i]));
        const known = new Set(foods.map((f) => f.id));
        const fresh = ((cached ?? []) as unknown as (Food & { source_id: string })[])
          .filter((f) => !known.has(f.id))
          .sort((a, b) => (order.get(a.source_id) ?? 0) - (order.get(b.source_id) ?? 0));
        foods.push(...fresh);
      }
    }
  }

  return NextResponse.json({ foods: foods.slice(0, 20), usda });
}
