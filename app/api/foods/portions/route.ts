import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabase-server';
import { buildPortions } from '../../../../lib/portions';
import { usdaFoodPortions } from '../../../../lib/usda';

/** The units a food can be logged in, and which one to start on. */
export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data: food, error } = await supabase
    .schema('chef')
    .from('foods')
    .select('name, source, source_id, serving_g, serving_label')
    .eq('id', id)
    .maybeSingle();
  if (error || !food) return NextResponse.json({ error: 'Food not found' }, { status: 404 });

  const usda = food.source === 'usda' && food.source_id ? await usdaFoodPortions(food.source_id, process.env.USDA_API_KEY ?? 'DEMO_KEY') : [];
  return NextResponse.json(buildPortions({ name: food.name, serving_g: food.serving_g != null ? Number(food.serving_g) : null, serving_label: food.serving_label }, usda));
}
