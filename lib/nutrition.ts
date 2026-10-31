/**
 * Calorie tracking helpers. Everything is stored per 100 g and logged in grams, so weighing food
 * (or a cooked recipe) works the same way as picking a serving.
 */

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEALS: { key: MealSlot; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snacks' },
];

/** A food as stored in chef.foods (nutrients per 100 g). */
export type Food = {
  id: string;
  source: 'usda' | 'off' | 'custom';
  name: string;
  brand: string | null;
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  fiber_100g: number | null;
  sugar_100g: number | null;
  sodium_mg_100g: number | null;
  serving_g: number | null;
  serving_label: string | null;
};

export const FOOD_COLUMNS =
  'id, source, name, brand, kcal_100g, protein_100g, carbs_100g, fat_100g, fiber_100g, sugar_100g, sodium_mg_100g, serving_g, serving_label';

export type Macros = { kcal: number; protein_g: number; carbs_g: number; fat_g: number };

export type LogEntry = Macros & {
  id: string;
  logged_on: string;
  meal: MealSlot;
  food_id: string | null;
  recipe_id: string | null;
  name: string;
  grams: number;
  /** The unit it was logged in, e.g. 2 x "large egg"; null when logged by weight. */
  quantity: number | null;
  portion_label: string | null;
  created_at: string;
};

export type Goals = {
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

export const ZERO_MACROS: Macros = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Macros for `grams` of a food, rounded to 0.1. */
export function macrosForGrams(food: Pick<Food, 'kcal_100g' | 'protein_100g' | 'carbs_100g' | 'fat_100g'>, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: round1(food.kcal_100g * f),
    protein_g: round1(food.protein_100g * f),
    carbs_g: round1(food.carbs_100g * f),
    fat_g: round1(food.fat_100g * f),
  };
}

export function sumMacros(entries: Macros[]): Macros {
  return entries.reduce(
    (total, e) => ({
      kcal: total.kcal + e.kcal,
      protein_g: total.protein_g + e.protein_g,
      carbs_g: total.carbs_g + e.carbs_g,
      fat_g: total.fat_g + e.fat_g,
    }),
    { ...ZERO_MACROS }
  );
}

/** The person's local calendar day as YYYY-MM-DD (not UTC, so late-evening meals land on the right day). */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return localDateKey(new Date(y, m - 1, d + days));
}

/** Parses a user-typed number; empty or invalid gives null. */
export function parseNumber(value: string): number | null {
  const n = Number(value.trim().replace(',', '.'));
  return value.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
}

/** Nutrients we pull out of a USDA food, by USDA nutrient number. Energy 208 is kcal; Atwater variants cover foundation foods. */
export const USDA_NUTRIENT = {
  kcal: ['208', '957', '958'],
  protein: ['203'],
  fat: ['204'],
  carbs: ['205'],
  fiber: ['291'],
  sugar: ['269', '269.3'],
  sodium: ['307'],
} as const;

const PROCESSED = /\b(flour|puffed|powder|dried|mix|infant|baby|pre-?gelatinized|instant|breaded|roll|nuggets|tenders|patties|canned|sliced|lunchmeat|luncheon|deli|flavor)\b/;

/**
 * Relevance for a food-name search, higher is better. Favors the plain whole food ("Rice, white, long-grain, raw")
 * over products made from it ("White rice, flour"), and generic foods over branded ones.
 */
export function foodSearchScore(name: string, brand: string | null, query: string): number {
  const lower = name.toLowerCase();
  const q = query.toLowerCase().trim();
  const terms = q.split(/\s+/).filter(Boolean);
  const head = lower.split(',').slice(0, 2).join(' ');

  let score = 0;
  const flat = lower.replace(/,/g, '');
  if (head.replace(/,/g, '').includes(q)) score += 4;
  else if (flat.includes(q)) score += 1;
  if (terms.every((t) => head.includes(t))) score += 3;
  if (/\b(raw|cooked)\b/.test(lower)) score += 3;
  const processed = lower.match(PROCESSED);
  if (processed && !q.includes(processed[1])) score -= 4;
  if (/\bwhole\b/.test(lower)) score += 1;
  if (brand) score -= 5;
  return score;
}
