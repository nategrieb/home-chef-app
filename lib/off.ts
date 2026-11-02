/**
 * Open Food Facts (community database of packaged foods, ODbL licence: credit them).
 * Rate limit: 15 product lookups a minute per IP, and they ask for a descriptive User-Agent with a contact.
 */

import { USDA_NUTRIENT } from './nutrition';

export type OffProduct = {
  code: string;
  name: string;
  brand: string | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium_mg: number | null;
  serving_g: number | null;
  serving_label: string | null;
};

type OffResponse = {
  status?: number;
  product?: {
    product_name?: string;
    product_name_en?: string;
    generic_name?: string;
    brands?: string;
    serving_size?: string;
    serving_quantity?: number | string;
    nutriments?: Record<string, number | string | undefined>;
  };
};

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
};

export async function fetchOffProduct(code: string): Promise<OffProduct | 'not_found' | 'unavailable'> {
  const userAgent = process.env.OFF_USER_AGENT ?? 'TheMenu/1.0 (nate@nategrieb.com)';
  const fields = 'product_name,product_name_en,generic_name,brands,serving_size,serving_quantity,nutriments';
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}?fields=${fields}`, {
      headers: { 'User-Agent': userAgent },
      next: { revalidate: 60 * 60 * 24 },
    });
    if (res.status === 404) return 'not_found';
    if (!res.ok) return 'unavailable';
    const body = (await res.json()) as OffResponse;
    const p = body.product;
    if (body.status !== 1 || !p) return 'not_found';

    const n = p.nutriments ?? {};
    const kj = num(n['energy_100g']);
    const salt = num(n['salt_100g']);
    const sodiumG = num(n['sodium_100g']);
    const serving = num(p.serving_quantity);

    return {
      code,
      name: (p.product_name || p.product_name_en || p.generic_name || '').trim(),
      brand: (p.brands ?? '').split(',')[0].trim() || null,
      kcal: num(n['energy-kcal_100g']) ?? (kj != null ? Math.round(kj / 4.184) : null),
      protein: num(n['proteins_100g']),
      carbs: num(n['carbohydrates_100g']),
      fat: num(n['fat_100g']),
      fiber: num(n['fiber_100g']),
      sugar: num(n['sugars_100g']),
      sodium_mg: sodiumG != null ? Math.round(sodiumG * 1000) : salt != null ? Math.round(salt * 400) : null,
      serving_g: serving && serving > 0 ? serving : null,
      serving_label: (p.serving_size ?? '').trim() || null,
    };
  } catch {
    return 'unavailable';
  }
}

/** "about 24 chips (28 g) (28 g)" -> "24 chips"; anything that isn't "<number> <unit>" falls back to plain grams. */
function cleanServingLabel(raw: string | null, grams: number | null): string | null {
  const text = (raw ?? '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^(about|approx\.?|approximately)\s+/i, '')
    .trim();
  if (/^\d+([./]\d+)?\s*[a-zA-Z][a-zA-Z .-]*$/.test(text)) return text;
  return grams ? `${grams} g` : null;
}

/** A product's brand, unless it just repeats the name ("Cheerios · Cheerios"). */
function distinctBrand(name: string, brand: string | null): string | null {
  if (!brand) return null;
  return name.toLowerCase().startsWith(brand.toLowerCase()) ? null : brand;
}

/** An Open Food Facts product as a chef.foods row, or null when it has no usable nutrition (the person fills it in). */
export function offToFoodRow(p: OffProduct) {
  const hasMacros = p.protein != null || p.carbs != null || p.fat != null;
  if (!p.name || (p.kcal == null && !hasMacros)) return null;

  const protein = p.protein ?? 0;
  const carbs = p.carbs ?? 0;
  const fat = p.fat ?? 0;
  const kcal = p.kcal ?? Math.round((protein * 4 + carbs * 4 + fat * 9) * 10) / 10;

  const nutrients: Record<string, { name: string; unit: string; per100g: number }> = {
    [USDA_NUTRIENT.kcal[0]]: { name: 'Energy', unit: 'KCAL', per100g: kcal },
    [USDA_NUTRIENT.protein[0]]: { name: 'Protein', unit: 'G', per100g: protein },
    [USDA_NUTRIENT.fat[0]]: { name: 'Total lipid (fat)', unit: 'G', per100g: fat },
    [USDA_NUTRIENT.carbs[0]]: { name: 'Carbohydrate, by difference', unit: 'G', per100g: carbs },
  };
  if (p.fiber != null) nutrients[USDA_NUTRIENT.fiber[0]] = { name: 'Fiber, total dietary', unit: 'G', per100g: p.fiber };
  if (p.sugar != null) nutrients[USDA_NUTRIENT.sugar[0]] = { name: 'Sugars, total', unit: 'G', per100g: p.sugar };
  if (p.sodium_mg != null) nutrients[USDA_NUTRIENT.sodium[0]] = { name: 'Sodium, Na', unit: 'MG', per100g: p.sodium_mg };

  return {
    source: 'off' as const,
    source_id: p.code,
    barcode: p.code,
    name: p.name,
    brand: distinctBrand(p.name, p.brand),
    kcal_100g: kcal,
    protein_100g: protein,
    carbs_100g: carbs,
    fat_100g: fat,
    fiber_100g: p.fiber,
    sugar_100g: p.sugar,
    sodium_mg_100g: p.sodium_mg,
    nutrients,
    serving_g: p.serving_g,
    serving_label: cleanServingLabel(p.serving_label, p.serving_g),
  };
}
