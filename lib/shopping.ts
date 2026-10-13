import { supabase } from './supabase';
import {
  buildShoppingStateKey,
  inferCanonicalIngredient,
  inferPreparationNote,
} from './ingredient-normalization';

export interface IngredientAlias {
  raw_term: string;
  canonical_name: string;
}

export interface IngredientPrepDetail {
  label: string;
  amount: number;
  unit: string;
  recipeTitles: string[];
}

export interface AggregatedIngredient {
  state_key: string;
  canonical_name: string;
  recipeTitles: string[];
  prep_details: IngredientPrepDetail[];
}

const UNIT_ALIASES: Record<string, string> = {
  tbsp: 'tbsp', tbs: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  cup: 'cup', cups: 'cup',
  clove: 'clove', cloves: 'clove',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  g: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml',
  l: 'l', liter: 'l', liters: 'l',
  can: 'can', cans: 'can',
  bunch: 'bunch', bunches: 'bunch',
  pinch: 'pinch', pinches: 'pinch',
  block: 'block', blocks: 'block',
  slice: 'slice', slices: 'slice',
  head: 'head', heads: 'head',
  carton: 'carton', cartons: 'carton',
  bag: 'bag', bags: 'bag',
  package: 'package', packages: 'package', pkg: 'package',
  container: 'container', containers: 'container',
  jar: 'jar', jars: 'jar',
  // "whole thing" counts all mean the same on a shopping list
  '': 'item', item: 'item', items: 'item', count: 'item', pcs: 'item', pc: 'item', piece: 'item', pieces: 'item',
  large: 'item', medium: 'item', small: 'item', each: 'item',
};

/** Collapse spelling variants (Tbsp/tbsp, cup/cups, count/pcs/large) into one unit. */
export function normalizeUnit(unit: string | null | undefined): string {
  const key = (unit ?? '').trim().toLowerCase();
  return UNIT_ALIASES[key] ?? key;
}

const PLURALS: Record<string, string> = {
  cup: 'cups', clove: 'cloves', can: 'cans', bunch: 'bunches', pinch: 'pinches', block: 'blocks', slice: 'slices',
  head: 'heads', carton: 'cartons', bag: 'bags', package: 'packages', container: 'containers', jar: 'jars',
};

/** Measures you cook with, not things you buy. The list shows just the name for these (you buy a jar, not 2 tbsp). */
const MEASURE_UNITS = new Set(['tsp', 'tbsp', 'cup', 'oz', 'ml', 'l', 'g', 'kg', 'pinch']);

/**
 * What to pick up at the store for one ingredient across all recipes: "3 cans", "2 lb", "5" (items).
 * Returns '' for pantry staples that are only measured, so the list shows the name alone.
 */
export function formatShopQuantity(prepDetails: { amount: number; unit: string }[]): string {
  const totals = new Map<string, number>();
  for (const { amount, unit } of prepDetails) {
    if (MEASURE_UNITS.has(unit) || !(amount > 0)) continue;
    totals.set(unit, (totals.get(unit) ?? 0) + amount);
  }
  return [...totals].map(([unit, amount]) => formatQuantity(amount, unit)).join(' + ');
}

/** "2 cups", "1 lb", "3" (for plain items) with tidy decimals. */
export function formatQuantity(amount: number, unit: string): string {
  const rounded = Number(amount.toFixed(2));
  const label = rounded > 1 && PLURALS[unit] ? PLURALS[unit] : unit;
  const showAmount = rounded > 0 ? String(rounded) : '';
  return [showAmount, label === 'item' ? '' : label].filter(Boolean).join(' ') || 'as needed';
}

export async function fetchAliases(): Promise<IngredientAlias[]> {
  const { data } = await supabase.from('ingredient_aliases').select('raw_term, canonical_name');
  // More specific aliases first to avoid broad-term collisions.
  return [...(data ?? [])].sort((a, b) => b.raw_term.length - a.raw_term.length);
}

interface IngredientRow {
  item_name?: string | null;
  canonical_name?: string | null;
  preparation_note?: string | null;
  amount?: number | string | null;
  unit?: string | null;
  /** What to buy for this ingredient, when it differs from the cooking measure (e.g. 4 cloves -> 1 head). */
  shop_amount?: number | string | null;
  shop_unit?: string | null;
}

/** The single place that decides which shopping-list line an ingredient belongs to. */
export function resolveCanonicalName(ing: IngredientRow, aliases: IngredientAlias[]): string {
  const inferred = (ing.canonical_name?.trim() || inferCanonicalIngredient(ing.item_name || '')).trim();
  const sourceText = `${ing.item_name || ''} ${inferred}`.toLowerCase();
  const aliasMatch = aliases.find((alias) => sourceText.includes(alias.raw_term.toLowerCase()));
  return (aliasMatch?.canonical_name || inferred).trim();
}

export function shoppingStateKey(canonicalName: string): string {
  return buildShoppingStateKey(canonicalName, 'all').trim().toLowerCase();
}

export function aggregateShoppingList(
  mealPlans: { recipe?: { title?: string; ingredients?: IngredientRow[] } | null }[],
  aliases: IngredientAlias[]
): AggregatedIngredient[] {
  const byCanonical = new Map<string, AggregatedIngredient>();

  for (const meal of mealPlans) {
    const recipeTitle = meal.recipe?.title || 'Recipe';

    for (const ing of meal.recipe?.ingredients ?? []) {
      const canonicalName = resolveCanonicalName(ing, aliases);
      if (!canonicalName) continue;

      const hasShop = ing.shop_unit && Number(ing.shop_amount) > 0;
      const unit = normalizeUnit(hasShop ? ing.shop_unit : ing.unit);
      const amount = Number(hasShop ? ing.shop_amount : ing.amount || 0);
      const prepLabel = (ing.preparation_note?.trim() || inferPreparationNote(ing.item_name || '', canonicalName) || 'General').trim();
      const groupKey = canonicalName.toLowerCase();

      let entry = byCanonical.get(groupKey);
      if (!entry) {
        entry = { state_key: shoppingStateKey(canonicalName), canonical_name: canonicalName, recipeTitles: [], prep_details: [] };
        byCanonical.set(groupKey, entry);
      }
      if (!entry.recipeTitles.includes(recipeTitle)) entry.recipeTitles.push(recipeTitle);

      const prep = entry.prep_details.find((p) => p.label === prepLabel && p.unit === unit);
      if (prep) {
        prep.amount += amount;
        if (!prep.recipeTitles.includes(recipeTitle)) prep.recipeTitles.push(recipeTitle);
      } else {
        entry.prep_details.push({ label: prepLabel, amount, unit, recipeTitles: [recipeTitle] });
      }
    }
  }

  const list = Array.from(byCanonical.values()).sort((a, b) => a.canonical_name.localeCompare(b.canonical_name));
  for (const item of list) item.prep_details.sort((a, b) => a.label.localeCompare(b.label));
  return list;
}

/**
 * Marks a recipe's ingredients as unchecked, using the same keys the list reads.
 * (Previously each page built `name|unit` keys that the list never looked at.)
 */
export async function markRecipeIngredientsUnchecked(recipeId: string) {
  const [{ data: ingredients }, aliases] = await Promise.all([
    supabase.from('ingredients').select('item_name, canonical_name, preparation_note, amount, unit').eq('recipe_id', recipeId),
    fetchAliases(),
  ]);

  const keys = Array.from(
    new Set((ingredients ?? []).map((ing) => shoppingStateKey(resolveCanonicalName(ing, aliases))).filter(Boolean))
  );

  if (keys.length > 0) {
    await supabase
      .from('shopping_list_state')
      .upsert(
        keys.map((item_name) => ({ item_name, is_checked: false, updated_at: new Date().toISOString() })),
        { onConflict: 'item_name' }
      );
  }
}

/** Loads everything the list needs in one round trip and refreshes the local cache. */
export async function fetchShoppingSnapshot(): Promise<ShoppingSnapshot> {
  const [plansRes, stateRes, manualRes, aliases] = await Promise.all([
    supabase.from('meal_plans').select('id, recipe:recipes (id, title, ingredients (*))').order('day_of_week'),
    supabase.from('shopping_list_state').select('item_name, is_checked'),
    supabase.from('shopping_list_manual_items').select('id, item_name').order('created_at', { ascending: false }),
    fetchAliases(),
  ]);

  if (plansRes.error || stateRes.error || manualRes.error) {
    throw new Error('Could not load the shopping list.');
  }

  const plans = (plansRes.data ?? []) as unknown as { id: string; recipe: { title?: string; ingredients?: IngredientRow[] } | null }[];
  const checked: Record<string, boolean> = {};
  for (const row of stateRes.data ?? []) checked[row.item_name.trim().toLowerCase()] = row.is_checked;

  const snapshot: ShoppingSnapshot = {
    list: aggregateShoppingList(plans, aliases),
    checked,
    manual: (manualRes.data ?? []) as { id: string; item_name: string }[],
    plans: plans.map((plan) => ({ id: plan.id })),
  };
  writeShoppingCache(snapshot);
  return snapshot;
}

export function countToGet(snapshot: ShoppingSnapshot): number {
  return snapshot.list.filter((item) => !snapshot.checked[item.state_key]).length + snapshot.manual.length;
}

const CACHE_KEY = 'menu:shopping-cache:v1';

export interface ShoppingSnapshot {
  list: AggregatedIngredient[];
  checked: Record<string, boolean>;
  manual: { id: string; item_name: string }[];
  plans: { id: string; recipeId?: string; title?: string }[];
}

export function readShoppingCache(): ShoppingSnapshot | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as ShoppingSnapshot) : null;
  } catch {
    return null;
  }
}

export function writeShoppingCache(snapshot: ShoppingSnapshot) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // storage full or unavailable; the cache is only an optimisation
  }
}

/** Refetch when anyone (you or your wife) changes the plan or the list. Needs Realtime enabled on these tables. */
export function subscribeToShoppingChanges(onChange: () => void) {
  const channel = supabase.channel('shopping-changes');
  for (const table of ['shopping_list_state', 'shopping_list_manual_items', 'meal_plans', 'ingredient_aliases']) {
    channel.on('postgres_changes', { event: '*', schema: 'chef', table }, onChange);
  }
  channel.subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
