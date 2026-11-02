/** Adds up every nutrient for a day of logging: foods directly, recipes through the foods they were built from. */

import { supabase } from './supabase';
import { NUTRIENTS, nutrientPer100g, type StoredNutrients } from './nutrients';
import type { RecipeItem } from './recipe-nutrition';

/** One food (or one ingredient of a recipe) that was eaten, and how much. */
export type Contribution = { foodId: string | null; grams: number; kcal: number; label: string };

export type NutrientTotal = { amount: number; kcalReported: number };

export type DayNutrients = {
  /** By NutrientDef.key; a nutrient no food reported is absent. */
  totals: Record<string, NutrientTotal>;
  /** Calories across everything counted, for judging how complete a nutrient's total is. */
  totalKcal: number;
  /** Foods with little vitamin and mineral data (custom foods, many packaged foods). */
  basicOnly: { label: string; kcal: number }[];
  /** Calories from foods with enough data to count for vitamins and minerals. */
  fullKcal: number;
  foodsTotal: number;
  foodsFull: number;
};

/** A food needs at least this many tracked vitamins or minerals to count as having full data. */
const FULL_DATA_MIN = 6;
const MICRO_KEYS = new Set(NUTRIENTS.filter((n) => n.group === 'vitamin' || n.group === 'mineral').map((n) => n.key));

export function computeDayNutrients(contributions: Contribution[], nutrientsByFood: Map<string, StoredNutrients>): DayNutrients {
  const totals: Record<string, NutrientTotal> = {};
  const basic = new Map<string, number>();
  const labels = new Set<string>();
  const fullLabels = new Set<string>();
  let totalKcal = 0;
  let fullKcal = 0;

  for (const c of contributions) {
    const stored = c.foodId ? nutrientsByFood.get(c.foodId) : undefined;
    let microCount = 0;
    totalKcal += c.kcal;
    labels.add(c.label);

    for (const def of NUTRIENTS) {
      const per100 = nutrientPer100g(stored, def);
      if (per100 == null) continue;
      const entry = (totals[def.key] ??= { amount: 0, kcalReported: 0 });
      entry.amount += (per100 * c.grams) / 100;
      entry.kcalReported += c.kcal;
      if (MICRO_KEYS.has(def.key)) microCount++;
    }

    if (microCount >= FULL_DATA_MIN) {
      fullKcal += c.kcal;
      fullLabels.add(c.label);
    } else {
      basic.set(c.label, (basic.get(c.label) ?? 0) + c.kcal);
    }
  }

  return {
    totals,
    totalKcal,
    basicOnly: [...basic.entries()].map(([label, kcal]) => ({ label, kcal })).sort((a, b) => b.kcal - a.kcal),
    fullKcal,
    foodsTotal: labels.size,
    foodsFull: fullLabels.size,
  };
}

type LogRow = { food_id: string | null; recipe_id: string | null; grams: number | string; kcal: number | string; name: string };
type RecipeRow = { recipe_id: string; total_grams: number | string; kcal: number | string; items: RecipeItem[] | null };

export async function fetchDayNutrients(day: string): Promise<DayNutrients> {
  const { data: logRows } = await supabase.from('food_log').select('food_id, recipe_id, grams, kcal, name').eq('logged_on', day);
  const rows = (logRows ?? []) as LogRow[];

  // Recipes are counted through the foods they're made of.
  const recipeIds = [...new Set(rows.map((r) => r.recipe_id).filter((id): id is string => Boolean(id)))];
  const recipes = new Map<string, RecipeRow>();
  if (recipeIds.length > 0) {
    const { data } = await supabase.from('recipe_nutrition').select('recipe_id, total_grams, kcal, items').in('recipe_id', recipeIds);
    for (const r of (data ?? []) as RecipeRow[]) recipes.set(r.recipe_id, r);
  }

  const contributions: Contribution[] = [];
  for (const row of rows) {
    const grams = Number(row.grams);
    const kcal = Number(row.kcal);
    const recipe = row.recipe_id ? recipes.get(row.recipe_id) : undefined;
    if (recipe && Array.isArray(recipe.items) && recipe.items.length > 0) {
      const share = grams / Number(recipe.total_grams);
      for (const item of recipe.items) {
        const itemKcal = ((item.per100?.kcal ?? 0) * item.grams) / 100;
        contributions.push({ foodId: item.food_id, grams: item.grams * share, kcal: itemKcal * share, label: row.name });
      }
    } else {
      contributions.push({ foodId: row.food_id, grams, kcal, label: row.name });
    }
  }

  const foodIds = [...new Set(contributions.map((c) => c.foodId).filter((id): id is string => Boolean(id)))];
  const nutrientsByFood = new Map<string, StoredNutrients>();
  if (foodIds.length > 0) {
    const { data } = await supabase.from('foods').select('id, nutrients').in('id', foodIds);
    for (const f of (data ?? []) as { id: string; nutrients: StoredNutrients | null }[]) nutrientsByFood.set(f.id, f.nutrients ?? {});
  }

  return computeDayNutrients(contributions, nutrientsByFood);
}
