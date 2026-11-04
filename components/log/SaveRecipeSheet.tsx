"use client";
import { useState } from 'react';
import { MEALS, parseNumber, type LogEntry, type MealSlot } from '../../lib/nutrition';
import { saveEntriesAsRecipe } from '../../lib/relog';
import { toast } from '../../lib/toast';

type Props = {
  entries: LogEntry[];
  meal: MealSlot;
  dateLabel: string;
  onClose: () => void;
};

/** Name a meal and keep it as a recipe. */
export default function SaveRecipeSheet({ entries, meal, dateLabel, onClose }: Props) {
  const mealLabel = MEALS.find((m) => m.key === meal)?.label ?? 'Meal';
  const [title, setTitle] = useState(`${mealLabel} · ${dateLabel}`);
  const [servingsText, setServingsText] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const servings = parseNumber(servingsText);
  const kcal = entries.reduce((sum, e) => sum + e.kcal, 0);

  async function save() {
    if (!title.trim() || !servings || servings <= 0) return;
    setSaving(true);
    setError(null);
    const { recipeId, error: saveError } = await saveEntriesAsRecipe(entries, { title: title.trim(), servings, meal });
    setSaving(false);
    if (saveError || !recipeId) {
      setError(saveError ?? 'Could not save the recipe.');
      return;
    }
    toast('Saved as a recipe');
    window.location.href = `/recipes/${recipeId}`;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-black text-slate-900">Save as a recipe</h2>
        <p className="mt-1 text-xs font-bold text-slate-400">
          {entries.length} item{entries.length === 1 ? '' : 's'} · {Math.round(kcal)} kcal in total
        </p>

        <label className="mt-4 block text-[10px] font-black uppercase tracking-widest text-slate-400">Name</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold text-slate-900 outline-none focus:border-[#004225]"
        />

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-700">This makes</span>
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

        {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl border border-slate-200 py-4 text-xs font-black uppercase tracking-widest text-slate-500 active:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !title.trim() || !servings || servings <= 0}
            className="flex-1 rounded-2xl bg-[#004225] py-4 text-xs font-black uppercase tracking-widest text-white disabled:opacity-40 active:scale-95"
          >
            {saving ? 'Saving…' : 'Save recipe'}
          </button>
        </div>
      </div>
    </div>
  );
}
