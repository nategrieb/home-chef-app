/** Putting what you already logged to use again: copy entries to another day, or turn a meal into a recipe. */

import { supabase } from './supabase';
import { inferCanonicalIngredient } from './ingredient-normalization';
import { totalsOf, type RecipeItem } from './recipe-nutrition';
import type { LogEntry, MealSlot } from './nutrition';

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Copy entries to a day (usually today), each into the meal it was in, with the same food and amount. */
export async function copyEntriesToDay(entries: LogEntry[], day: string): Promise<{ error: string | null }> {
  if (entries.length === 0) return { error: null };
  const { error } = await supabase.from('food_log').insert(
    entries.map((e) => ({
      logged_on: day,
      meal: e.meal,
      food_id: e.food_id,
      recipe_id: e.recipe_id,
      name: e.name,
      grams: e.grams,
      quantity: e.quantity,
      portion_label: e.portion_label,
      kcal: e.kcal,
      protein_g: e.protein_g,
      carbs_g: e.carbs_g,
      fat_g: e.fat_g,
    }))
  );
  return { error: error?.message ?? null };
}

const CATEGORY: Record<MealSlot, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

/**
 * Turn logged entries into a recipe: each entry becomes an ingredient (linked to its food, in grams) and the recipe
 * gets its nutrition from what was logged, so it can be logged again in one tap.
 */
export async function saveEntriesAsRecipe(
  entries: LogEntry[],
  { title, servings, meal }: { title: string; servings: number; meal: MealSlot }
): Promise<{ recipeId: string | null; error: string | null }> {
  const usable = entries.filter((e) => e.grams > 0);
  if (usable.length === 0) return { recipeId: null, error: 'Nothing to save.' };

  const { data: recipe, error } = await supabase
    .from('recipes')
    .insert([{ title, description: '', instructions: [''], category: CATEGORY[meal] }])
    .select('id')
    .single();
  if (error || !recipe) return { recipeId: null, error: error?.message ?? 'Could not create the recipe.' };

  const { error: ingredientError } = await supabase.from('ingredients').insert(
    usable.map((e) => ({
      recipe_id: recipe.id,
      item_name: e.name,
      canonical_name: inferCanonicalIngredient(e.name),
      amount: round1(e.grams),
      unit: 'g',
      calories_per_unit: 0,
      // Recipes logged as a unit have no food to link to; they stay as a plain line.
      ...(e.food_id ? { food_id: e.food_id, grams: e.grams } : {}),
    }))
  );
  if (ingredientError) return { recipeId: recipe.id, error: ingredientError.message };

  // Nutrition from what was actually logged, so the recipe matches the meal exactly.
  const items: RecipeItem[] = usable.map((e) => ({
    name: e.name,
    food_id: e.food_id,
    grams: e.grams,
    per100: { kcal: (e.kcal / e.grams) * 100, protein: (e.protein_g / e.grams) * 100, carbs: (e.carbs_g / e.grams) * 100, fat: (e.fat_g / e.grams) * 100 },
    line: `${round1(e.grams)} g ${e.name}`,
  }));
  const totals = totalsOf(items);
  const { error: nutritionError } = await supabase.from('recipe_nutrition').upsert(
    { recipe_id: recipe.id, servings, total_grams: totals.grams, kcal: totals.kcal, protein_g: totals.protein_g, carbs_g: totals.carbs_g, fat_g: totals.fat_g, items, updated_at: new Date().toISOString() },
    { onConflict: 'recipe_id' }
  );
  return { recipeId: recipe.id, error: nutritionError?.message ?? null };
}
