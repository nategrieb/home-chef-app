"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { supabase } from '../../lib/supabase';
import {
  FOOD_COLUMNS,
  MEALS,
  macrosForGrams,
  parseNumber,
  type Food,
  type LogEntry,
  type MealSlot,
} from '../../lib/nutrition';
import { MAX_ENTRY_GRAMS, amountText, buildPortions, type PortionOptions } from '../../lib/portions';
import { toast } from '../../lib/toast';
import { useFoodSearch } from '../../lib/useFoodSearch';
import BarcodeScanner from './BarcodeScanner';
import FoodForm, { type CustomStart } from './FoodForm';
import { recipeAsFood, type RecipeNutritionRow } from '../../lib/recipe-nutrition';

export type PickedFood = { food: Food; grams: number; quantity: number | null; portionLabel: string | null };

type Props = {
  meal: MealSlot;
  date: string;
  onClose: () => void;
  onAdded: (entry: LogEntry) => void;
  /** Pick mode (adding an ingredient to a recipe): hands back the food and amount instead of logging it. */
  onPick?: (pick: PickedFood) => void;
  /** Pick mode: lets the person skip the database and type the ingredient as text instead. */
  onType?: () => void;
  /** Open straight on this recipe's amount screen (the Log button on a recipe page). */
  initialRecipeId?: string;
  /** Open straight on the barcode scanner (the Scan button on Today). */
  startWith?: 'scan';
  /** Log something you already logged (from an earlier day): opens on its amount screen, at the same amount. */
  initialEntry?: LogEntry;
};

type Preset = { grams: number; quantity: number | null; portionLabel: string | null };
type Recent = { food: Food; last: Preset };

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold text-slate-900 outline-none focus:border-[#004225]';


// The on-screen keyboard shrinks the *visual* viewport but not the layout viewport, so size and place the sheet
// from the visual one. That keeps the search box above the keyboard instead of hidden behind it.
function subscribeViewport(callback: () => void) {
  const vv = window.visualViewport;
  window.addEventListener('resize', callback);
  vv?.addEventListener('resize', callback);
  vv?.addEventListener('scroll', callback);
  return () => {
    window.removeEventListener('resize', callback);
    vv?.removeEventListener('resize', callback);
    vv?.removeEventListener('scroll', callback);
  };
}
const getViewport = () => {
  const vv = window.visualViewport;
  return vv ? `${Math.round(vv.height)}:${Math.round(vv.offsetTop)}` : `${window.innerHeight}:0`;
};

function useVisualViewport() {
  const value = useSyncExternalStore(subscribeViewport, getViewport, () => '');
  if (!value) return { height: null as number | null, offsetTop: 0 };
  const [height, offsetTop] = value.split(':').map(Number);
  return { height, offsetTop };
}

const foodLabel = (food: Pick<Food, 'name' | 'brand'>) => (food.brand ? `${food.name} · ${food.brand}` : food.name);

export default function AddFoodSheet({ meal, date, onClose, onAdded, onPick, onType, initialRecipeId, initialEntry, startWith }: Props) {
  const [view, setView] = useState<'search' | 'amount' | 'custom' | 'scan'>(initialRecipeId || initialEntry ? 'amount' : startWith === 'scan' ? 'scan' : 'search');
  const [lookingUp, setLookingUp] = useState(false);
  const [customStart, setCustomStart] = useState<CustomStart | null>(null);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<Recent[]>([]);
  const [recipes, setRecipes] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [options, setOptions] = useState<PortionOptions | null>(null);
  const [unitIndex, setUnitIndex] = useState(0);
  const [qtyText, setQtyText] = useState('1');
  const chosenFoodId = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mealChoice, setMealChoice] = useState<MealSlot>(meal);
  // The empty search screen lists what you logged recently; recipes are one tap away.
  const [listTab, setListTab] = useState<'recent' | 'recipes'>('recent');
  const viewport = useVisualViewport();

  // Recipes with nutrition, and recent foods and recipes: one tap to log them again, at the amount you last used.
  useEffect(() => {
    if (onPick) return; // picking an ingredient needs none of this
    let cancelled = false;
    (async () => {
      // If the recipe nutrition table isn't set up yet this just comes back empty.
      const { data: nutrition } = await supabase
        .from('recipe_nutrition')
        .select('recipe_id, servings, total_grams, kcal, protein_g, carbs_g, fat_g, items, recipe:recipes (title)');
      const recipeFoods = ((nutrition ?? []) as unknown as (Record<string, unknown> & { recipe: { title: string } | null })[])
        .filter((r) => r.recipe)
        .map((r) =>
          recipeAsFood(r.recipe!.title, {
            recipe_id: r.recipe_id as string,
            servings: Number(r.servings),
            total_grams: Number(r.total_grams),
            kcal: Number(r.kcal),
            protein_g: Number(r.protein_g),
            carbs_g: Number(r.carbs_g),
            fat_g: Number(r.fat_g),
            items: [],
          } satisfies RecipeNutritionRow)
        )
        .sort((a, b) => a.name.localeCompare(b.name));
      const recipeById = new Map(recipeFoods.map((f) => [f.id, f]));

      const { data } = await supabase
        .from('food_log')
        .select(`grams, quantity, portion_label, recipe_id, created_at, food:foods (${FOOD_COLUMNS})`)
        .order('created_at', { ascending: false })
        .limit(300);
      if (cancelled) return;

      const seen = new Set<string>();
      const list: Recent[] = [];
      for (const row of (data ?? []) as unknown as { grams: number; quantity: number | null; portion_label: string | null; recipe_id: string | null; food: Food | null }[]) {
        const food = row.food ?? (row.recipe_id ? recipeById.get(row.recipe_id) : undefined);
        if (!food || seen.has(food.id)) continue;
        seen.add(food.id);
        list.push({
          food,
          last: {
            grams: Number(row.grams),
            quantity: row.quantity != null ? Number(row.quantity) : null,
            portionLabel: row.portion_label,
          },
        });
        if (list.length >= 30) break;
      }
      setRecipes(recipeFoods);
      setRecents(list);

      const start = initialRecipeId ? recipeById.get(initialRecipeId) : undefined;
      if (start) choose(start);
      else if (initialRecipeId) setView('search');

      if (initialEntry) {
        const preset: Preset = { grams: initialEntry.grams, quantity: initialEntry.quantity, portionLabel: initialEntry.portion_label };
        let food: Food | undefined = initialEntry.recipe_id ? recipeById.get(initialEntry.recipe_id) : undefined;
        if (!food && initialEntry.food_id) {
          const { data: row } = await supabase.from('foods').select(FOOD_COLUMNS).eq('id', initialEntry.food_id).maybeSingle();
          food = (row as Food | null) ?? undefined;
        }
        if (cancelled) return;
        if (food) choose(food, preset);
        else setView('search'); // that food has been deleted: search for it again
      }
    })();
    return () => {
      cancelled = true;
    };
    // choose() only uses setters and a ref, so it is safe to leave out of the dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { results, searching, notice } = useFoodSearch(query);

  /** Open the amount screen for a food, loading the units it can be measured in (eggs, slices, tbsp, grams...). */
  async function choose(food: Food, preset?: Preset) {
    chosenFoodId.current = food.id;
    setSelected(food);
    setOptions(null);
    setError(null);
    setView('amount');

    let loaded: PortionOptions;
    if (food.source === 'recipe') {
      loaded = buildPortions(food); // a recipe's units are its serving, grams and ounces
    } else {
      try {
        const res = await fetch(`/api/foods/portions?id=${encodeURIComponent(food.id)}`);
        if (!res.ok) throw new Error('portions unavailable');
        loaded = (await res.json()) as PortionOptions;
      } catch {
        // Offline or USDA hiccup: the food's own serving plus grams and ounces still work.
        loaded = buildPortions(food);
      }
    }
    if (chosenFoodId.current !== food.id) return; // picked something else meanwhile

    let index = loaded.defaultIndex;
    let quantity = loaded.defaultQuantity;
    if (preset) {
      const match = preset.portionLabel ? loaded.portions.findIndex((p) => p.label === preset.portionLabel) : -1;
      if (match >= 0 && preset.quantity) {
        index = match;
        quantity = preset.quantity;
      } else {
        index = loaded.portions.findIndex((p) => p.label === 'g');
        quantity = preset.grams;
      }
    }
    setOptions(loaded);
    setUnitIndex(index);
    setQtyText(String(Math.round(quantity * 100) / 100));
  }

  /** Switch unit. Between counted units (large egg -> small egg) the number stays; to or from grams the amount is converted. */
  function pickUnit(next: number) {
    if (!options) return;
    const from = options.portions[unitIndex];
    const to = options.portions[next];
    const qty = parseNumber(qtyText);
    if (qty != null && (from.kind === 'weight') !== (to.kind === 'weight')) {
      const converted = (qty * from.grams) / to.grams;
      setQtyText(String(to.kind === 'weight' ? Math.round(converted * 10) / 10 : Math.round(converted * 4) / 4 || 1));
    }
    setUnitIndex(next);
  }

  function nudge(direction: 1 | -1) {
    const portion = options?.portions[unitIndex];
    if (!portion) return;
    const current = parseNumber(qtyText) ?? 0;
    const next = Math.max(portion.step, Math.round((current + direction * portion.step) * 100) / 100);
    setQtyText(String(next));
  }

  /** A barcode was scanned or typed: find the food, or open the form with whatever we learned. */
  async function handleCode(code: string) {
    setLookingUp(true);
    setError(null);
    try {
      const res = await fetch(`/api/foods/barcode?code=${encodeURIComponent(code)}`);
      const body = (await res.json()) as {
        status: string;
        food?: Food;
        draft?: { name: string; brand: string | null; barcode: string; serving_g: number | null };
        offDown?: boolean;
        error?: string;
        storeKey?: string;
        priceCoded?: boolean;
      };
      if (body.status === 'invalid') {
        setError(body.error ?? 'That doesn’t look like a barcode.');
        return;
      }
      if (body.status === 'found' && body.food) {
        await choose(body.food);
        return;
      }
      const draft = body.draft;
      const label = body.priceCoded
        ? 'This looks like a store label with the price in the number, so it is saved by item and every label for it will match.'
        : 'It will be remembered for next time.';
      setCustomStart({
        name: draft?.name ?? '',
        brand: draft?.brand ?? '',
        barcode: body.storeKey ?? code,
        scanned: code,
        servingG: draft?.serving_g ?? null,
        notice:
          body.status === 'incomplete'
            ? `Found “${draft?.name}”, but it has no nutrition listed. Enter it from the label (per 100 g). ${label}`
            : body.offDown
              ? `The food database didn’t answer. Enter this one from the label. ${label}`
              : `This barcode isn’t in the food databases. Enter it from the label (per 100 g). ${label}`,
      });
      setView('custom');
    } catch {
      setError('Couldn’t look that up. Check your connection and try again.');
    } finally {
      setLookingUp(false);
    }
  }

  async function addEntry(food: Food, amount: Preset) {
    if (onPick) {
      onPick({ food, ...amount });
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    const macros = macrosForGrams(food, amount.grams);
    const { data, error: insertError } = await supabase
      .from('food_log')
      .insert({
        logged_on: date,
        meal: mealChoice,
        food_id: food.source === 'recipe' ? null : food.id,
        recipe_id: food.source === 'recipe' ? food.id : null,
        name: foodLabel(food),
        grams: amount.grams,
        quantity: amount.quantity,
        portion_label: amount.portionLabel,
        ...macros,
      })
      .select('*')
      .single();
    setSaving(false);
    if (insertError || !data) {
      setError(insertError?.message ?? 'Could not add that food.');
      return;
    }
    onAdded(data as LogEntry);
    toast(`Added to ${MEALS.find((m) => m.key === mealChoice)?.label ?? 'your log'}`);
    onClose();
  }

  const unit = options?.portions[unitIndex] ?? null;
  const quantity = parseNumber(qtyText);
  const grams = unit && quantity ? Math.round(quantity * unit.grams * 10) / 10 : null;
  const preview = selected && grams ? macrosForGrams(selected, grams) : null;
  const tooMuch = grams != null && grams > MAX_ENTRY_GRAMS;
  // Grams are stored as typed; every other unit remembers its quantity and name so the log can say "2 × large egg".
  const toLog = (): Preset | null =>
    grams && unit && quantity ? { grams, quantity: unit.label === 'g' ? null : quantity, portionLabel: unit.label === 'g' ? null : unit.label } : null;
  const showResults = query.trim().length >= 2;
  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matchingRecipes = onPick ? [] : recipes.filter((r) => queryTerms.every((t) => r.name.toLowerCase().includes(t)));
  const recipeServing = (food: Food): Preset => ({ grams: food.serving_g ?? 0, quantity: 1, portionLabel: 'serving' });
  const recipeRow = (food: Food) => (
    <li key={`recipe-${food.id}`} className="flex items-center gap-2">
      <button onClick={() => choose(food)} className="min-w-0 flex-1 rounded-2xl bg-emerald-50 px-4 py-3 text-left active:bg-emerald-100">
        <p className="truncate text-sm font-bold text-slate-900">{food.name}</p>
        <p className="text-xs font-bold text-emerald-800">
          Recipe · 1 serving · {Math.round(macrosForGrams(food, food.serving_g ?? 0).kcal)} kcal · {Math.round(macrosForGrams(food, food.serving_g ?? 0).protein_g)} P
        </p>
      </button>
      <button
        onClick={() => addEntry(food, recipeServing(food))}
        disabled={saving}
        aria-label={`Log 1 serving of ${food.name}`}
        className="h-12 w-12 shrink-0 rounded-2xl bg-[#004225] text-xl font-black text-white disabled:opacity-50 active:scale-95"
      >
        +
      </button>
    </li>
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-950/70 backdrop-blur-sm" onClick={onClose}>
      {/* Pinned to the top at a fixed height: results scroll underneath the search box instead of the sheet growing. */}
      <div
        className="flex w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl"
        style={{
          height: viewport.height ? `${Math.min(Math.max(viewport.height - 24, 320), 720)}px` : 'min(85dvh, 720px)',
          marginTop: `calc(0.75rem + ${viewport.offsetTop}px)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between px-6 pb-3 pt-5">
          <h2 className="text-xl font-black text-slate-900">
            {view === 'custom' ? (editingFood ? 'Edit food' : 'New food') : view === 'amount' ? 'How much?' : view === 'scan' ? 'Scan a barcode' : onPick ? 'Add ingredient' : 'Add food'}
          </h2>
          <button onClick={onClose} aria-label="Close" className="h-10 w-10 rounded-full text-2xl font-black text-slate-400 active:bg-slate-100">
            ×
          </button>
        </div>

        <div className="shrink-0 px-6">
          <div className={`mb-3 flex gap-1.5 ${onPick ? 'hidden' : ''}`}>
            {MEALS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMealChoice(m.key)}
                className={`flex-1 rounded-xl py-2 text-[10px] font-black uppercase tracking-wider ${
                  mealChoice === m.key ? 'bg-[#004225] text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {view === 'search' && (
            <>
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search foods, e.g. lentils, greek yogurt"
                  className={`${inputClass} min-w-0`}
                />
                <button
                  onClick={() => {
                    setError(null);
                    setView('scan');
                  }}
                  aria-label="Scan a barcode"
                  className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-[#004225] text-white active:scale-95"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8V6a2 2 0 012-2h2M17 4h2a2 2 0 012 2v2M21 16v2a2 2 0 01-2 2h-2M7 20H5a2 2 0 01-2-2v-2M7 8v8M11 8v8M14 8v8M17 8v8" />
                  </svg>
                </button>
              </div>
              {notice && <p className="mt-3 text-xs font-bold text-amber-700">{notice}</p>}
            </>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-3" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
          {view === 'search' && (
            <>
              {!showResults && !onPick && (recents.length > 0 || recipes.length > 0) && (
                <div className="mb-3 flex gap-2">
                  {([
                    ['recent', 'Recent'],
                    ['recipes', 'Recipes'],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setListTab(key)}
                      aria-pressed={listTab === key}
                      className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-widest ${listTab === key ? 'bg-[#004225] text-white' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {!showResults && !onPick && listTab === 'recipes' && (
                <ul className="space-y-2">{recipes.length > 0 ? recipes.map(recipeRow) : <li className="py-4 text-center text-sm font-bold text-slate-400">No recipes with nutrition yet.</li>}</ul>
              )}

              {!showResults && !onPick && listTab === 'recent' && recents.length > 0 && (
                <ul className="space-y-2">
                  {recents.map(({ food, last }) => (
                    <li key={food.id} className="flex items-center gap-2">
                      <button onClick={() => choose(food, last)} className={`min-w-0 flex-1 rounded-2xl px-4 py-3 text-left ${food.source === 'recipe' ? 'bg-emerald-50 active:bg-emerald-100' : 'bg-slate-50 active:bg-slate-100'}`}>
                        <p className="truncate text-sm font-bold text-slate-900">{foodLabel(food)}</p>
                        <p className={`text-xs font-bold ${food.source === 'recipe' ? 'text-emerald-800' : 'text-slate-400'}`}>
                          {food.source === 'recipe' ? 'Recipe · ' : ''}
                          {amountText({ grams: last.grams, quantity: last.quantity, portion_label: last.portionLabel })} · {Math.round(macrosForGrams(food, last.grams).kcal)} kcal
                        </p>
                      </button>
                      <button
                        onClick={() => addEntry(food, last)}
                        disabled={saving}
                        aria-label={`Add ${amountText({ grams: last.grams, quantity: last.quantity, portion_label: last.portionLabel })} of ${food.name} again`}
                        className="h-12 w-12 shrink-0 rounded-2xl bg-[#004225] text-xl font-black text-white disabled:opacity-50 active:scale-95"
                      >
                        +
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!showResults && !onPick && listTab === 'recent' && recents.length === 0 && (
                <p className="py-4 text-center text-sm font-bold text-slate-400">What you log shows up here, so you can add it again in one tap.</p>
              )}

              {showResults && (
                <ul className="space-y-2">
                  {matchingRecipes.map(recipeRow)}
                  {results.map((food) => (
                    <li key={food.id}>
                      <button onClick={() => choose(food)} className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-left active:bg-slate-100">
                        <p className="truncate text-sm font-bold text-slate-900">{foodLabel(food)}</p>
                        <p className="text-xs font-bold text-slate-400">
                          {Math.round(food.kcal_100g)} kcal · {food.protein_100g} P · {food.carbs_100g} C · {food.fat_100g} F per 100 g
                          {food.source === 'custom' ? ' · yours' : ''}
                        </p>
                      </button>
                    </li>
                  ))}
                  {searching && results.length === 0 && matchingRecipes.length === 0 && <li className="py-4 text-center text-sm font-bold text-slate-400">Searching…</li>}
                  {!searching && results.length === 0 && matchingRecipes.length === 0 && <li className="py-4 text-center text-sm font-bold text-slate-400">No matches yet.</li>}
                </ul>
              )}

              {onType && (
                <button
                  onClick={() => {
                    onType();
                    onClose();
                  }}
                  className="mt-5 w-full rounded-2xl bg-slate-100 py-4 text-xs font-black uppercase tracking-widest text-slate-600 active:bg-slate-200"
                >
                  Type it instead
                </button>
              )}
              <button
                onClick={() => setView('custom')}
                className="mt-3 w-full rounded-2xl border-2 border-dashed border-slate-200 py-4 text-xs font-black uppercase tracking-widest text-slate-400 active:border-[#004225] active:text-[#004225]"
              >
                + Create a food
              </button>
            </>
          )}

          {view === 'amount' && !selected && <p className="mt-8 text-center text-sm font-bold text-slate-400">Loading…</p>}
          {view === 'amount' && selected && (
            <>
              <p className="text-base font-black text-slate-900">{foodLabel(selected)}</p>
              {selected.source === 'custom' && (
                <button
                  onClick={() => {
                    setEditingFood(selected);
                    setView('custom');
                  }}
                  className="mt-1 text-[11px] font-black uppercase tracking-widest text-[#004225] underline underline-offset-2"
                >
                  Edit this food
                </button>
              )}
              <p className="mt-1 text-xs font-bold text-slate-400">
                {selected.source === 'recipe'
                  ? `Recipe · ${Math.round(macrosForGrams(selected, selected.serving_g ?? 0).kcal)} kcal per serving`
                  : `${Math.round(selected.kcal_100g)} kcal per 100 g`}
              </p>

              {!options || !unit ? (
                <p className="mt-8 text-center text-sm font-bold text-slate-400">Loading amounts…</p>
              ) : (
                <>
                  <label className="mt-5 block text-[10px] font-black uppercase tracking-widest text-slate-400">How many?</label>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => nudge(-1)}
                      aria-label="Less"
                      className="h-14 w-14 shrink-0 rounded-2xl bg-slate-100 text-2xl font-black text-slate-600 active:bg-slate-200"
                    >
                      −
                    </button>
                    <input
                      autoFocus
                      inputMode="decimal"
                      value={qtyText}
                      onChange={(e) => setQtyText(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      aria-label={`Amount in ${unit.label}`}
                      className={`${inputClass} min-w-0 text-center text-2xl`}
                    />
                    <button
                      onClick={() => nudge(1)}
                      aria-label="More"
                      className="h-14 w-14 shrink-0 rounded-2xl bg-slate-100 text-2xl font-black text-slate-600 active:bg-slate-200"
                    >
                      +
                    </button>
                  </div>
                  <p className="mt-2 text-center text-sm font-black text-slate-500">
                    {unit.label === 'g' ? '' : `× ${unit.label} = `}
                    {grams ? `${Math.round(grams * 10) / 10} g` : ''}
                  </p>
                  {tooMuch && <p className="mt-1 text-center text-xs font-bold text-red-600">That’s over {MAX_ENTRY_GRAMS / 1000} kg. Check the number.</p>}

                  <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Measured in</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {options.portions.map((p, i) => (
                      <button
                        key={`${p.label}-${i}`}
                        onClick={() => pickUnit(i)}
                        aria-pressed={i === unitIndex}
                        className={`rounded-full px-4 py-2 text-xs font-black ${
                          i === unitIndex ? 'bg-[#004225] text-white' : 'bg-slate-100 text-slate-600 active:bg-slate-200'
                        }`}
                      >
                        {p.label}
                        {p.kind !== 'weight' && <span className="opacity-60"> · {Math.round(p.grams * 10) / 10} g</span>}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-4 gap-2 rounded-2xl bg-slate-50 p-4 text-center">
                    {[
                      ['kcal', preview?.kcal],
                      ['protein', preview?.protein_g],
                      ['carbs', preview?.carbs_g],
                      ['fat', preview?.fat_g],
                    ].map(([label, value]) => (
                      <div key={label as string}>
                        <p className="text-lg font-black text-slate-900">{value != null ? Math.round(value as number) : '—'}</p>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label as string}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}

              <div className="mt-5 flex gap-3">
                <button onClick={() => setView('search')} className="flex-1 rounded-2xl border border-slate-200 py-4 text-xs font-black uppercase tracking-widest text-slate-500 active:bg-slate-50">
                  Back
                </button>
                <button
                  onClick={() => {
                    const amount = toLog();
                    if (amount) addEntry(selected, amount);
                  }}
                  disabled={!grams || saving || tooMuch}
                  className="flex-1 rounded-2xl bg-[#004225] py-4 text-xs font-black uppercase tracking-widest text-white disabled:opacity-40 active:scale-95"
                >
                  {saving ? 'Adding…' : onPick ? 'Add to recipe' : 'Add'}
                </button>
              </div>
            </>
          )}

          {view === 'scan' && (
            <>
              <BarcodeScanner onCode={handleCode} onCancel={() => setView('search')} busy={lookingUp} />
              {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}
            </>
          )}

          {view === 'custom' && (
            <FoodForm
              start={customStart ?? { name: query.trim(), brand: '', barcode: null, scanned: null, servingG: null, notice: null }}
              existing={editingFood ?? undefined}
              onCancel={() => {
                setCustomStart(null);
                if (editingFood) {
                  setView('amount');
                  setEditingFood(null);
                } else {
                  setView('search');
                }
              }}
              onSaved={(food) => {
                setCustomStart(null);
                setEditingFood(null);
                choose(food);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
