/**
 * Recipe nutrition: a recipe's totals, built from foods, so a whole recipe can be logged as "1 serving" or by grams.
 */

import { FOOD_COLUMNS, type Food, type MealSlot } from './nutrition';
import type { Portion } from './portions';

export type Per100 = { kcal: number; protein: number; carbs: number; fat: number };

/** One food in a recipe, with its nutrition per 100 g so changing the grams never needs another lookup. */
export type RecipeItem = {
  name: string;
  food_id: string | null;
  grams: number;
  per100: Per100;
  /** The ingredient line this came from ("1/2 cup Oats"), for reference. */
  line?: string;
  /** The grams were estimated (an unusual unit, or no household measure): worth a second look. */
  guess?: boolean;
};

export type RecipeNutritionRow = {
  recipe_id: string;
  servings: number;
  total_grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items: RecipeItem[];
  /** Set by the one-time backfill: 'estimated' = worth a glance, 'check' = something looked off. Cleared on any edit. */
  review?: 'estimated' | 'check' | null;
};

export const itemMacros = (item: RecipeItem) => {
  const f = item.grams / 100;
  return { kcal: item.per100.kcal * f, protein_g: item.per100.protein * f, carbs_g: item.per100.carbs * f, fat_g: item.per100.fat * f };
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function totalsOf(items: RecipeItem[]) {
  const sum = items.reduce(
    (t, item) => {
      const m = itemMacros(item);
      return { grams: t.grams + item.grams, kcal: t.kcal + m.kcal, protein_g: t.protein_g + m.protein_g, carbs_g: t.carbs_g + m.carbs_g, fat_g: t.fat_g + m.fat_g };
    },
    { grams: 0, kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
  return { grams: round1(sum.grams), kcal: round1(sum.kcal), protein_g: round1(sum.protein_g), carbs_g: round1(sum.carbs_g), fat_g: round1(sum.fat_g) };
}

export const perServing = (row: Pick<RecipeNutritionRow, 'servings' | 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g' | 'total_grams'>) => ({
  kcal: row.kcal / row.servings,
  protein_g: row.protein_g / row.servings,
  carbs_g: row.carbs_g / row.servings,
  fat_g: row.fat_g / row.servings,
  grams: row.total_grams / row.servings,
});

/** A recipe shaped like a food (per 100 g plus one serving), so the amount screen and the log treat it the same way. */
export function recipeAsFood(title: string, row: RecipeNutritionRow): Food & { recipe_id: string } {
  const per100 = (n: number) => Math.round((n / row.total_grams) * 100 * 100) / 100;
  return {
    id: row.recipe_id,
    recipe_id: row.recipe_id,
    source: 'recipe',
    name: title,
    brand: null,
    kcal_100g: per100(row.kcal),
    protein_100g: per100(row.protein_g),
    carbs_100g: per100(row.carbs_g),
    fat_100g: per100(row.fat_g),
    fiber_100g: null,
    sugar_100g: null,
    sodium_mg_100g: null,
    serving_g: Math.round((row.total_grams / row.servings) * 10) / 10,
    serving_label: '1 serving',
  };
}

/** Meal to preselect for "log it now": breakfast in the morning, lunch around noon, dinner in the evening. */
export function mealForNow(date: Date = new Date()): MealSlot {
  const h = date.getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

// ---------------------------------------------------------------------------
// Ingredient amounts -> grams
// ---------------------------------------------------------------------------

const TSP_PER: Record<string, number> = { tsp: 1, tbsp: 3, cup: 48, 'fl oz': 6, ml: 0.2029, l: 202.9 };
const GRAMS_PER: Record<string, number> = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };

function normalizeUnit(unit: string | null | undefined): string {
  const u = (unit ?? '').toLowerCase().replace(/\./g, '').trim();
  if (/^(tablespoons?|tbsps?|tbs|tbl)$/.test(u)) return 'tbsp';
  if (/^(teaspoons?|tsps?)$/.test(u)) return 'tsp';
  if (/^(cups?|c)$/.test(u)) return 'cup';
  if (/^(fl oz|fluid ounces?)$/.test(u)) return 'fl oz';
  if (/^(ounces?|oz)$/.test(u)) return 'oz';
  if (/^(pounds?|lbs?)$/.test(u)) return 'lb';
  if (/^(grams?|g)$/.test(u)) return 'g';
  if (/^(kilograms?|kg)$/.test(u)) return 'kg';
  if (/^(milliliters?|millilitres?|ml)$/.test(u)) return 'ml';
  if (/^(liters?|litres?|l)$/.test(u)) return 'l';
  if (/^(pinch|dash)$/.test(u)) return 'pinch';
  return u;
}

/** Tsp-equivalent of a household portion label ("cup", "tbsp", "cup, sliced", "tsp"), or null if it isn't a volume. */
function portionTsp(label: string): number | null {
  const l = label.toLowerCase();
  if (/\bcup\b/.test(l)) return 48;
  if (/\btbsp\b/.test(l)) return 3;
  if (/\btsp\b/.test(l)) return 1;
  if (/fl oz/.test(l)) return 6;
  return null;
}

/**
 * Grams for "amount unit" of a food, using the food's household measures. `guess` marks answers that rest on an
 * assumption (water density for a volume, or a typical piece for a bare count) so the builder can flag them.
 */
export function ingredientGrams(amount: number, unit: string | null | undefined, portions: Portion[]): { grams: number; guess: boolean } | null {
  if (!(amount > 0)) return null;
  const u = normalizeUnit(unit);

  if (GRAMS_PER[u]) return { grams: amount * GRAMS_PER[u], guess: false };

  if (u === 'pinch') return { grams: 0.36 * amount, guess: true };

  if (TSP_PER[u]) {
    const tsp = amount * TSP_PER[u];
    // Prefer a plain measure of the same unit, then any other volume measure (the density is the same).
    const volumes = portions.filter((p) => p.kind === 'volume' && portionTsp(p.label) !== null);
    const exact = volumes.find((p) => p.label === u) ?? volumes.find((p) => portionTsp(p.label) === TSP_PER[u]) ?? volumes[0];
    if (exact) return { grams: (tsp * exact.grams) / (portionTsp(exact.label) as number), guess: false };
    return { grams: tsp * 4.93, guess: true }; // 1 tsp of water is 4.93 g
  }

  // Counted units: a clove, a slice, a can, or no unit at all ("2 eggs").
  const counts = portions.filter((p) => p.kind === 'count');
  const named = u ? counts.find((p) => p.label.includes(u) || u.includes(p.label)) : undefined;
  if (named) return { grams: amount * named.grams, guess: false };
  const typical = counts.find((p) => /\b(large|medium)\b/.test(p.label)) ?? counts[0];
  if (typical) return { grams: amount * typical.grams, guess: true };

  // Packaging units with no household measure on the food: a typical size, flagged as a guess.
  const typicalPack = PACKAGE_GRAMS[u];
  if (typicalPack) return { grams: amount * typicalPack, guess: true };
  return null;
}

/** Rough weight of one can, jar or package when the food has no measure for it. */
const PACKAGE_GRAMS: Record<string, number> = { can: 400, jar: 350, package: 300, container: 300, bag: 300, carton: 950 };

export { FOOD_COLUMNS };
