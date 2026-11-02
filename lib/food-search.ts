import { FOOD_COLUMNS, foodSearchScore, type Food } from './nutrition';
import { rankByQuery, toFoodRow, usdaSearch } from './usda';
import type { SupabaseClient } from '@supabase/supabase-js';

type ServerSupabase = SupabaseClient;

export type UsdaStatus = 'ok' | 'rate_limited' | 'unavailable' | 'cache_failed' | 'skipped';
export type FoodSearchResult = { foods: Food[]; usda: UsdaStatus; error?: string };

/**
 * Food search shared by the search box and the recipe nutrition builder: your own and saved foods first, then
 * USDA FoodData Central (generic foods, optionally branded products), saved as they are found.
 */
export async function searchFoods(
  supabase: ServerSupabase,
  query: string,
  options: { includeBranded?: boolean; limit?: number } = {}
): Promise<FoodSearchResult> {
  const { includeBranded = true, limit = 20 } = options;
  const q = query.trim();
  if (q.length < 2) return { foods: [], usda: 'skipped' };

  // Every word must appear in the name, in any order. Strip characters with meaning in PostgREST/LIKE.
  const terms = q.toLowerCase().split(/\s+/).map((t) => t.replace(/[%_,()*\\]/g, '')).filter(Boolean).slice(0, 5);
  if (terms.length === 0) return { foods: [], usda: 'skipped' };

  const chef = supabase.schema('chef');

  // 1) Your own custom foods and everything already cached.
  let local = chef.from('foods').select(FOOD_COLUMNS).limit(15);
  for (const term of terms) local = local.ilike('name', `%${term}%`);
  const { data: localFoods, error: localError } = await local;
  if (localError) {
    console.error('foods search failed:', localError);
    return { foods: [], usda: 'skipped', error: `Food search failed: ${localError.message}` };
  }

  const foods: Food[] = [...((localFoods ?? []) as Food[])];

  // 2) USDA for anything not cached yet. Generic foods first, then branded products.
  let usda: UsdaStatus = 'skipped';
  if (q.length >= 3) {
    const apiKey = process.env.USDA_API_KEY ?? 'DEMO_KEY';
    const [generic, branded] = await Promise.all([
      usdaSearch(q, 'Foundation,SR Legacy', 100, apiKey),
      includeBranded ? usdaSearch(q, 'Branded', 8, apiKey) : Promise.resolve([]),
    ]);

    if (generic === 'rate_limited' || branded === 'rate_limited') usda = 'rate_limited';
    else if (generic === null && branded === null) usda = 'unavailable';
    else {
      usda = 'ok';
      const rows = [
        ...rankByQuery(Array.isArray(generic) ? generic : [], q).slice(0, 8),
        ...(Array.isArray(branded) ? branded : []),
      ]
        .map(toFoodRow)
        .filter((row): row is NonNullable<ReturnType<typeof toFoodRow>> => row !== null);

      if (rows.length > 0) {
        // Cache what we found; then read it back to get row ids (existing rows are left as they are).
        let cacheError = (await chef.from('foods').upsert(rows, { onConflict: 'source,source_id', ignoreDuplicates: true })).error;
        if (cacheError) {
          // One retry: a dropped connection to the database shouldn't silently hide the USDA results.
          cacheError = (await chef.from('foods').upsert(rows, { onConflict: 'source,source_id', ignoreDuplicates: true })).error;
        }
        if (cacheError) {
          console.error('caching USDA foods failed:', cacheError);
          usda = 'cache_failed';
        }
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

  // Your own foods first; then best match (plain whole foods before products), then shorter names.
  foods.sort(
    (a, b) =>
      Number(b.source === 'custom') - Number(a.source === 'custom') ||
      foodSearchScore(b.name, b.brand, q) - foodSearchScore(a.name, a.brand, q) ||
      a.name.length - b.name.length
  );

  return { foods: foods.slice(0, limit), usda };
}
