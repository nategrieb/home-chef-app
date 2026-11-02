import { buildPortions, type PortionOptions } from './portions';
import { usdaFoodPortions } from './usda';
import type { SupabaseClient } from '@supabase/supabase-js';

type ServerSupabase = SupabaseClient;

/** The units a saved food can be logged in, and which one to start on. Null when the food isn't visible to this user. */
export async function loadPortionOptions(supabase: ServerSupabase, foodId: string): Promise<PortionOptions | null> {
  const { data: food, error } = await supabase
    .schema('chef')
    .from('foods')
    .select('name, source, source_id, serving_g, serving_label')
    .eq('id', foodId)
    .maybeSingle();
  if (error || !food) return null;

  const usda = food.source === 'usda' && food.source_id ? await usdaFoodPortions(food.source_id, process.env.USDA_API_KEY ?? 'DEMO_KEY') : [];
  return buildPortions({ name: food.name, serving_g: food.serving_g != null ? Number(food.serving_g) : null, serving_label: food.serving_label }, usda);
}
