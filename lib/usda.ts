/** USDA FoodData Central: search and mapping into chef.foods rows (all nutrients per 100 g). */

import { USDA_NUTRIENT, foodSearchScore } from './nutrition';

const USDA_SEARCH = 'https://api.nal.usda.gov/fdc/v1/foods/search';

export type UsdaNutrient = { nutrientNumber?: string; nutrientName?: string; unitName?: string; value?: number };
export type UsdaFood = {
  fdcId: number;
  description: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: UsdaNutrient[];
};

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s(/,-])[a-z]/g, (m) => m.toUpperCase());

function pick(nutrients: UsdaNutrient[], numbers: readonly string[]): number | null {
  for (const number of numbers) {
    const hit = nutrients.find((n) => n.nutrientNumber === number && typeof n.value === 'number');
    if (hit) return hit.value as number;
  }
  return null;
}

/** USDA search result -> a chef.foods row (all values per 100 g). */
export function toFoodRow(f: UsdaFood) {
  const nutrients = f.foodNutrients ?? [];
  const branded = f.dataType === 'Branded';
  const grams = f.servingSizeUnit && /^(g|grm)$/i.test(f.servingSizeUnit) ? f.servingSize ?? null : null;

  const all: Record<string, { name: string; unit: string; per100g: number }> = {};
  for (const n of nutrients) {
    if (n.nutrientNumber && typeof n.value === 'number') {
      all[n.nutrientNumber] = { name: n.nutrientName ?? n.nutrientNumber, unit: n.unitName ?? '', per100g: n.value };
    }
  }

  const rawKcal = pick(nutrients, USDA_NUTRIENT.kcal);
  const rawProtein = pick(nutrients, USDA_NUTRIENT.protein);
  const rawCarbs = pick(nutrients, USDA_NUTRIENT.carbs);
  const rawFat = pick(nutrients, USDA_NUTRIENT.fat);
  // Some entries (a few foundation oils) have no energy or macro data at all; they'd log as 0 kcal, so skip them.
  if (rawKcal == null && rawProtein == null && rawCarbs == null && rawFat == null) return null;

  // "Carbs by difference" can come out slightly negative for meats; a negative amount makes no sense.
  const protein = Math.max(0, rawProtein ?? 0);
  const carbs = Math.max(0, rawCarbs ?? 0);
  const fat = Math.max(0, rawFat ?? 0);
  // Some foundation foods (oils, for one) come without an energy value. Estimate it with the standard 4/4/9 factors
  // rather than showing 0 kcal.
  const kcal = rawKcal ?? Math.round((protein * 4 + carbs * 4 + fat * 9) * 10) / 10;

  return {
    source: 'usda' as const,
    source_id: String(f.fdcId),
    barcode: f.gtinUpc ?? null,
    name: branded ? titleCase(f.description) : f.description,
    brand: branded ? (f.brandName ?? f.brandOwner ?? null) : null,
    kcal_100g: kcal,
    protein_100g: protein,
    carbs_100g: carbs,
    fat_100g: fat,
    fiber_100g: pick(nutrients, USDA_NUTRIENT.fiber),
    sugar_100g: pick(nutrients, USDA_NUTRIENT.sugar),
    sodium_mg_100g: pick(nutrients, USDA_NUTRIENT.sodium),
    nutrients: all,
    serving_g: grams,
    serving_label: branded ? (f.householdServingFullText ?? (grams ? `${grams} g` : null)) : null,
  };
}

export async function usdaSearch(query: string, dataType: string, pageSize: number, apiKey: string): Promise<UsdaFood[] | 'rate_limited' | null> {
  const url = `${USDA_SEARCH}?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(query)}&pageSize=${pageSize}&dataType=${encodeURIComponent(dataType)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (res.status === 429) return 'rate_limited';
    if (!res.ok) return null;
    return ((await res.json()) as { foods?: UsdaFood[] }).foods ?? [];
  } catch {
    return null;
  }
}


/**
 * USDA's own ordering for plain foods can be odd ("chicken breast" -> lunchmeat first). Keep results that contain
 * every search word and order them with the same relevance score the search route uses.
 */
export function rankByQuery(foods: UsdaFood[], query: string): UsdaFood[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lower = (f: UsdaFood) => f.description.toLowerCase();
  const matching = foods.filter((f) => terms.every((t) => lower(f).includes(t)));
  const pool = matching.length > 0 ? matching : foods;
  return [...pool].sort(
    (a, b) =>
      foodSearchScore(b.description, null, query) - foodSearchScore(a.description, null, query) ||
      a.description.length - b.description.length
  );
}
