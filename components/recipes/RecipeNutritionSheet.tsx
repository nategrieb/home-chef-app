"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { parseNumber, type Food } from '../../lib/nutrition';
import { MAX_ENTRY_GRAMS } from '../../lib/portions';
import { itemMacros, totalsOf, type RecipeItem, type RecipeNutritionRow } from '../../lib/recipe-nutrition';
import FoodPicker from './FoodPicker';

type Props = {
  recipeId: string;
  title: string;
  existing: RecipeNutritionRow | null;
  onClose: () => void;
  onSaved: (row: RecipeNutritionRow) => void;
};

const itemFromFood = (food: Food, grams: number, line?: string): RecipeItem => ({
  name: food.name,
  food_id: food.id,
  grams,
  per100: { kcal: food.kcal_100g, protein: food.protein_100g, carbs: food.carbs_100g, fat: food.fat_100g },
  line,
});

/**
 * Build a recipe's nutrition from foods. A new recipe starts from a draft matched from its ingredients; every line
 * can be changed (food or grams), removed, or added to. The result is stored as totals so logging is one tap.
 */
export default function RecipeNutritionSheet({ recipeId, title, existing, onClose, onSaved }: Props) {
  const [items, setItems] = useState<RecipeItem[] | null>(existing ? existing.items : null);
  const [gramsText, setGramsText] = useState<string[]>(existing ? existing.items.map((i) => String(i.grams)) : []);
  const [servingsText, setServingsText] = useState(String(existing?.servings ?? 1));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<{ index: number | 'new' } | null>(null);

  // First time: draft from the recipe's ingredients.
  useEffect(() => {
    if (existing) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/recipes/suggest?recipeId=${encodeURIComponent(recipeId)}`);
        const body = (await res.json()) as { items?: RecipeItem[]; error?: string };
        if (cancelled) return;
        if (!res.ok || !body.items) throw new Error(body.error ?? 'Could not draft nutrition');
        setItems(body.items);
        setGramsText(body.items.map((i) => (i.grams ? String(i.grams) : '')));
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : 'Could not draft nutrition');
        setItems([]);
        setGramsText([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [existing, recipeId]);

  const live: RecipeItem[] = (items ?? []).map((item, i) => ({ ...item, grams: parseNumber(gramsText[i] ?? '') ?? 0 }));
  const counted = live.filter((item) => item.grams > 0 && item.food_id);
  const totals = totalsOf(counted);
  const servings = parseNumber(servingsText);
  const per = servings && servings > 0 ? { kcal: totals.kcal / servings, p: totals.protein_g / servings, c: totals.carbs_g / servings, f: totals.fat_g / servings, g: totals.grams / servings } : null;
  const skipped = live.length - counted.length;
  const tooMuch = totals.grams > MAX_ENTRY_GRAMS;

  function pickFood(food: Food) {
    if (!picker || !items) return;
    if (picker.index === 'new') {
      setItems([...items, itemFromFood(food, 100)]);
      setGramsText([...gramsText, '100']);
    } else {
      const old = items[picker.index];
      setItems(items.map((item, i) => (i === picker.index ? itemFromFood(food, parseNumber(gramsText[i] ?? '') ?? 0, old.line) : item)));
    }
    setPicker(null);
  }

  function removeAt(index: number) {
    if (!items) return;
    setItems(items.filter((_, i) => i !== index));
    setGramsText(gramsText.filter((_, i) => i !== index));
  }

  async function save() {
    if (!per || !servings || counted.length === 0 || tooMuch) return;
    setSaving(true);
    setSaveError(null);
    const row: RecipeNutritionRow = {
      recipe_id: recipeId,
      servings,
      total_grams: totals.grams,
      kcal: totals.kcal,
      protein_g: totals.protein_g,
      carbs_g: totals.carbs_g,
      fat_g: totals.fat_g,
      items: counted,
    };
    const { error } = await supabase.from('recipe_nutrition').upsert({ ...row, ...(existing?.review ? { review: null } : {}), updated_at: new Date().toISOString() }, { onConflict: 'recipe_id' });
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    onSaved(row);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mt-3 flex w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl"
        style={{ height: 'min(92dvh, 760px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-6 pb-2 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="truncate text-xl font-black text-slate-900">{existing ? 'Edit nutrition' : 'Add nutrition'}</h2>
            <button onClick={onClose} aria-label="Close" className="h-10 w-10 rounded-full text-2xl font-black text-slate-400 active:bg-slate-100">
              ×
            </button>
          </div>
          <p className="truncate text-xs font-bold uppercase tracking-widest text-slate-400">{title}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-2">
          {items === null ? (
            <p className="py-10 text-center text-sm font-bold text-slate-400">Matching your ingredients to foods…</p>
          ) : (
            <>
              {!existing && (
                <p className="mb-3 text-xs font-bold text-slate-500">
                  A first draft from the ingredients. Check each food and amount; tap a food name to change it.
                </p>
              )}
              {loadError && <p className="mb-3 text-xs font-bold text-red-600">{loadError}. Add foods by hand below.</p>}

              <ul className="space-y-3">
                {live.map((item, i) => (
                  <li key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    {item.line && (
                      <p className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span className="truncate">{item.line}</span>
                        {item.guess && <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">check</span>}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPicker({ index: i })} className="min-w-0 flex-1 text-left">
                        <span className={`block truncate text-sm font-bold ${item.food_id ? 'text-slate-900' : 'text-amber-700'}`}>
                          {item.food_id ? item.name : 'No match: tap to choose a food'}
                        </span>
                        <span className="block text-xs font-bold text-slate-400">{Math.round(itemMacros(item).kcal)} kcal</span>
                      </button>
                      <input
                        inputMode="decimal"
                        value={gramsText[i] ?? ''}
                        onChange={(e) => setGramsText(gramsText.map((g, idx) => (idx === i ? e.target.value : g)))}
                        onFocus={(e) => e.target.select()}
                        aria-label={`Grams of ${item.name}`}
                        placeholder="0"
                        className="w-20 rounded-xl border border-slate-200 bg-white px-2 py-2 text-right text-base font-bold text-slate-900 outline-none focus:border-[#004225]"
                      />
                      <span className="text-xs font-black text-slate-400">g</span>
                      <button onClick={() => removeAt(i)} aria-label={`Remove ${item.name}`} className="h-9 w-9 shrink-0 rounded-xl bg-red-50 text-lg font-black text-red-500 active:bg-red-100">
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setPicker({ index: 'new' })}
                className="mt-3 w-full rounded-2xl border-2 border-dashed border-slate-200 py-3.5 text-xs font-black uppercase tracking-widest text-slate-400 active:border-[#004225] active:text-[#004225]"
              >
                + Add a food
              </button>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">This recipe makes</span>
                <span className="flex items-center gap-2">
                  <input
                    inputMode="decimal"
                    value={servingsText}
                    onChange={(e) => setServingsText(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    aria-label="Servings"
                    className="w-16 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-center text-base font-bold text-slate-900 outline-none focus:border-[#004225]"
                  />
                  <span className="text-sm font-bold text-slate-500">serving{servings === 1 ? '' : 's'}</span>
                </span>
              </div>
              <div className="h-4" />
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 px-6 pt-3" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          {per && counted.length > 0 ? (
            <div className="mb-3 grid grid-cols-4 gap-2 text-center">
              {[
                ['kcal', per.kcal],
                ['protein', per.p],
                ['carbs', per.c],
                ['fat', per.f],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-lg font-black text-slate-900">{Math.round(value as number)}</p>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label as string}</p>
                </div>
              ))}
            </div>
          ) : null}
          <p className="mb-2 text-center text-[11px] font-bold text-slate-400">
            {per && counted.length > 0 ? `per serving · ${Math.round(per.g)} g · whole recipe ${Math.round(totals.kcal)} kcal` : 'Add at least one food with an amount.'}
            {skipped > 0 ? ` · ${skipped} line${skipped === 1 ? '' : 's'} left out (no food or amount)` : ''}
          </p>
          {tooMuch && <p className="mb-2 text-center text-xs font-bold text-red-600">That’s over {MAX_ENTRY_GRAMS / 1000} kg in total. Check the amounts.</p>}
          {saveError && <p className="mb-2 text-center text-xs font-bold text-red-600">{saveError}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-2xl border border-slate-200 py-3.5 text-xs font-black uppercase tracking-widest text-slate-500 active:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !per || counted.length === 0 || tooMuch}
              className="flex-1 rounded-2xl bg-[#004225] py-3.5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-40 active:scale-95"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {picker && <FoodPicker title={picker.index === 'new' ? 'Add a food' : 'Change food'} onPick={pickFood} onClose={() => setPicker(null)} />}
    </div>
  );
}
