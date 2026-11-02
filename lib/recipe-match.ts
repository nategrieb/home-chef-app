/**
 * Turns a recipe's ingredient lines into foods with grams: a draft of the recipe's nutrition.
 * Used by the "Add nutrition" builder (one recipe, on request) and by the one-time backfill (every recipe).
 *
 * A line that is already linked to a food (scanned or picked) uses that food. Otherwise the ingredient name is
 * searched, leaning toward raw/dry foods since ingredient lists name things the way they're bought. "1/2 cup" or
 * "2 cloves" become grams using that food's own household measures.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { searchFoods } from './food-search';
import { loadPortionOptions } from './food-portions';
import { FOOD_COLUMNS, type Food } from './nutrition';
import type { Portion } from './portions';
import { ingredientGrams, type RecipeItem } from './recipe-nutrition';
import { FOOD_SEARCH_OVERRIDES, NO_AMOUNT_OK, TYPICAL_ITEM_G, TYPICAL_PACK_G } from './ingredient-food-overrides';

export type IngredientInput = {
  item_name: string;
  canonical_name: string | null;
  amount: number | string | null;
  unit: string | null;
  food_id?: string | null;
  grams?: number | string | null;
};

export type Confidence = 'linked' | 'matched' | 'check' | 'skipped';
export type MatchedLine = RecipeItem & { confidence: Confidence; reason?: string };

type FoodWithPortions = { food: Food; portions: Portion[] };

const fmtAmount = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

// Ingredient lists name things the way they're bought: dry oats, raw chicken. So lean toward raw/dry entries, unless
// the line says "cooked".
const rawness = (food: Food, line: string) => {
  const n = food.name.toLowerCase();
  if (/\bcooked\b/.test(line.toLowerCase())) return /\b(cooked|boiled)\b/.test(n) ? 3 : 0;
  return (/\b(raw|dry|uncooked)\b/.test(n) ? 3 : 0) - (/\b(cooked|boiled|prepared)\b/.test(n) ? 4 : 0);
};

export function createMatcher(supabase: SupabaseClient) {
  const foodById = new Map<string, Promise<FoodWithPortions | null>>();
  const foodByTerm = new Map<string, Promise<FoodWithPortions | null>>();

  function loadFood(id: string): Promise<FoodWithPortions | null> {
    let hit = foodById.get(id);
    if (!hit) {
      hit = (async () => {
        const { data } = await supabase.schema('chef').from('foods').select(FOOD_COLUMNS).eq('id', id).maybeSingle();
        if (!data) return null;
        const options = await loadPortionOptions(supabase, id);
        return options ? { food: data as unknown as Food, portions: options.portions } : null;
      })();
      foodById.set(id, hit);
    }
    return hit;
  }

  function findFood(term: string, line: string): Promise<FoodWithPortions | null> {
    const key = `${term.toLowerCase()}|${/\bcooked\b/i.test(line)}`;
    let hit = foodByTerm.get(key);
    if (!hit) {
      hit = (async () => {
        const found = await searchFoods(supabase, term, { includeBranded: false, limit: 12 });
        const best = [...found.foods].sort((a, b) => rawness(b, line) - rawness(a, line) || found.foods.indexOf(a) - found.foods.indexOf(b))[0];
        return best ? loadFood(best.id) : null;
      })();
      foodByTerm.set(key, hit);
    }
    return hit;
  }

  async function match(ing: IngredientInput): Promise<MatchedLine> {
    const amount = Number(ing.amount ?? 0);
    const unit = ing.unit && ing.unit !== 'item' ? ` ${ing.unit}` : ing.unit === 'item' ? '' : '';
    const line = `${amount > 0 ? fmtAmount(amount) : ''}${unit} ${ing.item_name}`.trim();
    const empty = { per100: { kcal: 0, protein: 0, carbs: 0, fat: 0 } };

    // Already linked to a food: use it.
    if (ing.food_id) {
      const linked = await loadFood(ing.food_id);
      if (linked) {
        const stored = Number(ing.grams ?? 0);
        const converted = stored > 0 ? null : ingredientGrams(amount, ing.unit, linked.portions);
        const grams = stored > 0 ? stored : converted?.grams ?? 0;
        const guess = stored > 0 ? false : converted ? converted.guess : true;
        return {
          name: linked.food.name,
          food_id: linked.food.id,
          grams: Math.round(grams * 10) / 10,
          per100: { kcal: linked.food.kcal_100g, protein: linked.food.protein_100g, carbs: linked.food.carbs_100g, fat: linked.food.fat_100g },
          line,
          guess,
          confidence: guess ? 'check' : 'linked',
          reason: grams > 0 ? undefined : 'no amount',
        };
      }
    }

    const nameKey = (ing.canonical_name || ing.item_name).trim().toLowerCase();
    if (!(amount > 0)) {
      const ok = NO_AMOUNT_OK.test(nameKey);
      return { name: ing.item_name, food_id: null, grams: 0, ...empty, line, guess: !ok, confidence: ok ? 'skipped' : 'check', reason: 'no amount' };
    }

    const term = FOOD_SEARCH_OVERRIDES[nameKey] ?? (ing.canonical_name || ing.item_name);
    const unitKey = (ing.unit ?? '').toLowerCase();
    const canned = unitKey === 'can' || unitKey === 'jar';
    // "1 can chickpeas" means the canned, drained kind, not dry chickpeas.
    const found = (canned && !/canned|tomato|tuna|tofu/.test(term.toLowerCase()) ? await findFood(`${term} canned`, line) : null) ?? (await findFood(term, line));
    if (!found) return { name: ing.item_name, food_id: null, grams: 0, ...empty, line, guess: true, confidence: 'check', reason: 'no matching food' };

    let converted = ingredientGrams(amount, ing.unit, found.portions);
    // Whole items and packages: a typical weight beats a stray household measure ("1 avocado" is not 50 g).
    const counted = !unitKey || ['item', 'clove', 'head', 'bunch', 'slice'].includes(unitKey);
    const packed = ['can', 'jar', 'package', 'container', 'block'].includes(unitKey);
    const table = counted ? TYPICAL_ITEM_G : packed ? TYPICAL_PACK_G : null;
    const typical = table?.find(([re]) => re.test(nameKey))?.[1];
    if (typical) converted = { grams: amount * typical, guess: false }; // a typical size is good enough not to flag
    const guess = converted ? converted.guess : true;
    return {
      name: found.food.name,
      food_id: found.food.id,
      grams: converted ? Math.round(converted.grams * 10) / 10 : 0,
      per100: { kcal: found.food.kcal_100g, protein: found.food.protein_100g, carbs: found.food.carbs_100g, fat: found.food.fat_100g },
      line,
      guess,
      confidence: guess ? 'check' : 'matched',
      reason: converted ? (converted.guess ? 'amount estimated' : undefined) : 'could not turn the amount into grams',
    };
  }

  return { match };
}
