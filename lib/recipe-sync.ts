/**
 * A recipe's ingredient lines are the source of truth. Its nutrition is worked out from them, so the two are kept in
 * step from both sides: editing nutrition writes the amounts back to the ingredients, and saving the ingredients
 * recomputes the nutrition.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { inferCanonicalIngredient } from './ingredient-normalization';
import { totalsOf, type RecipeItem, type RecipeNutritionRow } from './recipe-nutrition';

// The app's client is bound to the chef schema, so accept any schema.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, any, any>;

type IngredientRow = { id: string; item_name: string; food_id: string | null; amount: number | string | null; unit: string | null; grams: number | string | null };

export type ItemChange = {
  /** The line as it was when the sheet opened; null for a food added in the sheet. */
  origin: RecipeItem | null;
  item: RecipeItem;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Which ingredient each item came from: by linked food first, then by the item's original line text. */
function pairItems(ingredients: IngredientRow[], items: RecipeItem[]) {
  const byItem = new Map<RecipeItem, string>();
  const used = new Set<string>();
  const take = (item: RecipeItem, test: (ing: IngredientRow) => boolean) => {
    const hit = ingredients.find((ing) => !used.has(ing.id) && test(ing));
    if (hit) {
      used.add(hit.id);
      byItem.set(item, hit.id);
    }
    return !!hit;
  };
  for (const item of items) if (item.food_id) take(item, (ing) => ing.food_id === item.food_id);
  for (const item of items) {
    if (byItem.has(item) || !item.line) continue;
    const line = item.line.toLowerCase();
    take(item, (ing) => !!ing.item_name && line.endsWith(ing.item_name.trim().toLowerCase()));
  }
  return byItem;
}

/** Write what was changed in the nutrition sheet back to the recipe's ingredients. */
export async function writeBackToIngredients(supabase: Client, recipeId: string, changes: ItemChange[], removed: RecipeItem[]) {
  const { data } = await supabase.from('ingredients').select('id, item_name, food_id, amount, unit, grams').eq('recipe_id', recipeId);
  const ingredients = (data ?? []) as IngredientRow[];
  const origins = [...changes.map((c) => c.origin).filter((o): o is RecipeItem => !!o), ...removed];
  const paired = pairItems(ingredients, origins);

  for (const { origin, item } of changes) {
    if (!origin) {
      await supabase.from('ingredients').insert({
        recipe_id: recipeId,
        item_name: item.name,
        canonical_name: inferCanonicalIngredient(item.name),
        amount: round1(item.grams),
        unit: 'g',
        food_id: item.food_id,
        grams: item.grams,
        calories_per_unit: 0,
      });
      continue;
    }
    const id = paired.get(origin);
    if (!id) continue;
    const foodChanged = item.food_id !== origin.food_id;
    const ing = ingredients.find((row) => row.id === id);
    // What the ingredient weighs now, when it says so (so a recipe that drifted out of step is put right on save);
    // otherwise compare with what the line was when the sheet opened.
    const now = ing?.grams != null && Number(ing.grams) > 0 ? Number(ing.grams) : ing?.unit === 'g' && Number(ing.amount) > 0 ? Number(ing.amount) : origin.grams;
    if (!foodChanged && Math.abs(item.grams - now) < 0.05) continue;
    await supabase
      .from('ingredients')
      .update({
        amount: round1(item.grams),
        unit: 'g',
        grams: item.grams,
        food_id: item.food_id,
        // A new amount means the shopping list should work from it again.
        shop_amount: null,
        shop_unit: null,
        ...(foodChanged ? { item_name: item.name, canonical_name: inferCanonicalIngredient(item.name) } : {}),
      })
      .eq('id', id);
  }

  for (const item of removed) {
    const id = paired.get(item);
    if (id) await supabase.from('ingredients').delete().eq('id', id);
  }
}

/** Recompute a recipe's saved nutrition from its current ingredient lines, keeping its servings. */
export async function refreshNutrition(supabase: Client, recipeId: string, servings: number): Promise<RecipeNutritionRow | null> {
  try {
    const res = await fetch(`/api/recipes/suggest?recipeId=${encodeURIComponent(recipeId)}`);
    const body = (await res.json()) as { items?: RecipeItem[] };
    if (!res.ok || !body.items) return null;
    const counted = body.items.filter((item) => item.grams > 0 && item.food_id);
    if (counted.length === 0) return null;
    const totals = totalsOf(counted);
    const row: RecipeNutritionRow = {
      recipe_id: recipeId,
      servings,
      total_grams: totals.grams,
      kcal: totals.kcal,
      protein_g: totals.protein_g,
      carbs_g: totals.carbs_g,
      fat_g: totals.fat_g,
      items: counted,
    };
    const { error } = await supabase.from('recipe_nutrition').upsert({ ...row, review: counted.some((i) => i.guess) ? 'estimated' : null, updated_at: new Date().toISOString() }, { onConflict: 'recipe_id' });
    return error ? null : row;
  } catch {
    return null;
  }
}
