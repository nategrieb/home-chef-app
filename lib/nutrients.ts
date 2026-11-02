/**
 * The nutrients shown on the Nutrition screen and their suggested daily amounts.
 *
 * Amounts are the FDA Daily Values (the numbers on a US nutrition label, set for adults on a 2,000 calorie day).
 * They are a general reference, not medical advice and not tailored to age, sex or health. Fiber is scaled to the
 * person's calorie goal (14 g per 1,000 calories). Foods store every nutrient USDA gave us, keyed by USDA nutrient
 * number, so each nutrient below lists the numbers it can be read from, best first.
 */

export type StoredNutrients = Record<string, { name?: string; unit?: string; per100g: number }>;

export type NutrientGroup = 'vitamin' | 'mineral' | 'limit' | 'other';
export type DisplayUnit = 'g' | 'mg' | 'mcg';

export type NutrientDef = {
  key: string;
  label: string;
  group: NutrientGroup;
  unit: DisplayUnit;
  /** Suggested amount per day, or the daily limit when `limit` is true. Null = no reference amount. */
  daily: number | null;
  limit?: boolean;
  /** USDA nutrient numbers to read from, best first. */
  numbers: string[];
};

export const NUTRIENTS: NutrientDef[] = [
  // Vitamins
  { key: 'vitA', label: 'Vitamin A', group: 'vitamin', unit: 'mcg', daily: 900, numbers: ['320'] },
  { key: 'vitC', label: 'Vitamin C', group: 'vitamin', unit: 'mg', daily: 90, numbers: ['401'] },
  { key: 'vitD', label: 'Vitamin D', group: 'vitamin', unit: 'mcg', daily: 20, numbers: ['328', '324'] },
  { key: 'vitE', label: 'Vitamin E', group: 'vitamin', unit: 'mg', daily: 15, numbers: ['323'] },
  { key: 'vitK', label: 'Vitamin K', group: 'vitamin', unit: 'mcg', daily: 120, numbers: ['430'] },
  { key: 'thiamin', label: 'Thiamin (B1)', group: 'vitamin', unit: 'mg', daily: 1.2, numbers: ['404'] },
  { key: 'riboflavin', label: 'Riboflavin (B2)', group: 'vitamin', unit: 'mg', daily: 1.3, numbers: ['405'] },
  { key: 'niacin', label: 'Niacin (B3)', group: 'vitamin', unit: 'mg', daily: 16, numbers: ['406'] },
  { key: 'pantothenic', label: 'Pantothenic acid (B5)', group: 'vitamin', unit: 'mg', daily: 5, numbers: ['410'] },
  { key: 'b6', label: 'Vitamin B6', group: 'vitamin', unit: 'mg', daily: 1.7, numbers: ['415'] },
  { key: 'biotin', label: 'Biotin (B7)', group: 'vitamin', unit: 'mcg', daily: 30, numbers: ['416'] },
  { key: 'folate', label: 'Folate (B9)', group: 'vitamin', unit: 'mcg', daily: 400, numbers: ['435', '417'] },
  { key: 'b12', label: 'Vitamin B12', group: 'vitamin', unit: 'mcg', daily: 2.4, numbers: ['418'] },
  { key: 'choline', label: 'Choline', group: 'vitamin', unit: 'mg', daily: 550, numbers: ['421'] },

  // Minerals
  { key: 'calcium', label: 'Calcium', group: 'mineral', unit: 'mg', daily: 1300, numbers: ['301'] },
  { key: 'iron', label: 'Iron', group: 'mineral', unit: 'mg', daily: 18, numbers: ['303'] },
  { key: 'magnesium', label: 'Magnesium', group: 'mineral', unit: 'mg', daily: 420, numbers: ['304'] },
  { key: 'phosphorus', label: 'Phosphorus', group: 'mineral', unit: 'mg', daily: 1250, numbers: ['305'] },
  { key: 'potassium', label: 'Potassium', group: 'mineral', unit: 'mg', daily: 4700, numbers: ['306'] },
  { key: 'zinc', label: 'Zinc', group: 'mineral', unit: 'mg', daily: 11, numbers: ['309'] },
  { key: 'copper', label: 'Copper', group: 'mineral', unit: 'mg', daily: 0.9, numbers: ['312'] },
  { key: 'manganese', label: 'Manganese', group: 'mineral', unit: 'mg', daily: 2.3, numbers: ['315'] },
  { key: 'selenium', label: 'Selenium', group: 'mineral', unit: 'mcg', daily: 55, numbers: ['317'] },
  { key: 'iodine', label: 'Iodine', group: 'mineral', unit: 'mcg', daily: 150, numbers: ['314'] },
  { key: 'chromium', label: 'Chromium', group: 'mineral', unit: 'mcg', daily: 35, numbers: ['334'] },
  { key: 'molybdenum', label: 'Molybdenum', group: 'mineral', unit: 'mcg', daily: 45, numbers: ['316'] },

  // Things to keep under a limit
  { key: 'sodium', label: 'Sodium', group: 'limit', unit: 'mg', daily: 2300, limit: true, numbers: ['307'] },
  { key: 'satfat', label: 'Saturated fat', group: 'limit', unit: 'g', daily: 20, limit: true, numbers: ['606'] },
  { key: 'cholesterol', label: 'Cholesterol', group: 'limit', unit: 'mg', daily: 300, limit: true, numbers: ['601'] },
  { key: 'addedSugar', label: 'Added sugars', group: 'limit', unit: 'g', daily: 50, limit: true, numbers: ['539'] },

  // Other, shown without a suggested amount (fiber gets one from the calorie goal)
  { key: 'fiber', label: 'Fiber', group: 'other', unit: 'g', daily: 28, numbers: ['291'] },
  { key: 'sugar', label: 'Sugars', group: 'other', unit: 'g', daily: null, numbers: ['269', '269.3'] },
  { key: 'transfat', label: 'Trans fat', group: 'other', unit: 'g', daily: null, numbers: ['605'] },
];

const TO_MG: Record<string, number> = { g: 1000, mg: 1, ug: 0.001, mcg: 0.001 };
const FROM_MG: Record<DisplayUnit, number> = { g: 0.001, mg: 1, mcg: 1000 };

/** Per 100 g of a food, in the nutrient's display unit; null when the food doesn't report it. */
export function nutrientPer100g(stored: StoredNutrients | null | undefined, def: NutrientDef): number | null {
  if (!stored) return null;
  for (const number of def.numbers) {
    const hit = stored[number];
    if (!hit || typeof hit.per100g !== 'number') continue;
    const unit = (hit.unit ?? '').toLowerCase();
    if (unit === 'iu') {
      // Only vitamin D has a clean conversion: 40 IU = 1 mcg.
      if (def.key === 'vitD') return hit.per100g / 40;
      continue;
    }
    const toMg = TO_MG[unit];
    if (toMg === undefined) continue;
    return hit.per100g * toMg * FROM_MG[def.unit];
  }
  return null;
}

/** The suggested daily amount for a nutrient, with fiber following the person's calorie goal. */
export function dailyAmount(def: NutrientDef, calorieGoal: number | null): number | null {
  if (def.key === 'fiber' && calorieGoal && calorieGoal > 0) return Math.round((14 * calorieGoal) / 1000);
  return def.daily;
}

/** "12.3 mg", "1,240 mg", "0.4 mg". */
export function formatAmount(value: number, unit: DisplayUnit): string {
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  const rounded = Number(value.toFixed(digits));
  return `${rounded.toLocaleString(undefined, { maximumFractionDigits: digits })} ${unit}`;
}
