"use client";
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { parseNumber, type Goals } from '../../lib/nutrition';

type Props = {
  goals: Goals;
  onClose: () => void;
  onSaved: (goals: Goals) => void;
};

const MACROS: { key: 'protein_g' | 'carbs_g' | 'fat_g'; label: string; kcalPerGram: number; color: string }[] = [
  { key: 'protein_g', label: 'Protein', kcalPerGram: 4, color: 'bg-[#004225]' },
  { key: 'carbs_g', label: 'Carbs', kcalPerGram: 4, color: 'bg-amber-500' },
  { key: 'fat_g', label: 'Fat', kcalPerGram: 9, color: 'bg-sky-500' },
];

type MacroKey = (typeof MACROS)[number]['key'];
const kcalOf = (g: Record<MacroKey, number>) => MACROS.reduce((sum, m) => sum + g[m.key] * m.kcalPerGram, 0);

export default function GoalsSheet({ goals, onClose, onSaved }: Props) {
  const [values, setValues] = useState<Record<MacroKey, string>>({
    protein_g: goals.protein_g != null ? String(goals.protein_g) : '',
    carbs_g: goals.carbs_g != null ? String(goals.carbs_g) : '',
    fat_g: goals.fat_g != null ? String(goals.fat_g) : '',
  });
  const [kcalText, setKcalText] = useState(goals.kcal != null ? String(goals.kcal) : '');
  // The macros as they were when you started typing a calorie number, so the split stays put however you type.
  const [base, setBase] = useState<{ kcal: number; grams: Record<MacroKey, number> } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grams = (v: Record<MacroKey, string>): Record<MacroKey, number> => ({
    protein_g: parseNumber(v.protein_g) ?? 0,
    carbs_g: parseNumber(v.carbs_g) ?? 0,
    fat_g: parseNumber(v.fat_g) ?? 0,
  });
  const current = grams(values);
  const fromMacros = kcalOf(current);
  const hasMacros = fromMacros > 0;

  // Calories follow the macros: change any macro and the total moves with it.
  function setMacro(key: MacroKey, text: string) {
    const next = { ...values, [key]: text };
    setValues(next);
    setBase(null);
    const total = kcalOf(grams(next));
    setKcalText(total > 0 ? String(Math.round(total)) : '');
  }

  // Calories are also editable: the macros scale together, keeping their percentages.
  function setCalories(text: string) {
    setKcalText(text);
    const target = parseNumber(text);
    const snapshot = base ?? (hasMacros ? { kcal: fromMacros, grams: current } : null);
    if (!snapshot || target == null) return;
    if (!base) setBase(snapshot);
    const factor = target / snapshot.kcal;
    setValues({
      protein_g: String(Math.round(snapshot.grams.protein_g * factor)),
      carbs_g: String(Math.round(snapshot.grams.carbs_g * factor)),
      fat_g: String(Math.round(snapshot.grams.fat_g * factor)),
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setError('Sign in again to save goals.');
      setSaving(false);
      return;
    }

    const next: Goals = {
      kcal: parseNumber(kcalText),
      protein_g: parseNumber(values.protein_g),
      carbs_g: parseNumber(values.carbs_g),
      fat_g: parseNumber(values.fat_g),
    };
    const { error: saveError } = await supabase
      .from('nutrition_goals')
      .upsert({ user_id: auth.user.id, ...next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }
    onSaved(next);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-black text-slate-900">Daily goals</h2>
        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">Only you see these</p>

        <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
          <span>
            <span className="block text-sm font-bold text-slate-700">Calories</span>
            <span className="block text-[11px] font-bold text-slate-400">{hasMacros ? 'Add up from your macros. Edit to scale them.' : 'Set your macros and this fills in.'}</span>
          </span>
          <span className="flex items-center gap-2">
            <input
              inputMode="decimal"
              value={kcalText}
              onChange={(e) => setCalories(e.target.value)}
              onFocus={(e) => e.target.select()}
              onBlur={() => setBase(null)}
              aria-label="Calories"
              placeholder="—"
              className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-xl font-black text-slate-900 outline-none focus:border-[#004225]"
            />
            <span className="w-8 text-xs font-bold text-slate-400">kcal</span>
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {MACROS.map((m) => {
            const share = hasMacros ? Math.round(((current[m.key] * m.kcalPerGram) / fromMacros) * 100) : null;
            return (
              <label key={m.key} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <span className={`h-2.5 w-2.5 rounded-full ${m.color}`} aria-hidden="true" />
                  {m.label}
                  {share != null && <span className="text-xs font-bold text-slate-400">{share}%</span>}
                </span>
                <span className="flex items-center gap-2">
                  <input
                    inputMode="decimal"
                    value={values[m.key]}
                    onChange={(e) => setMacro(m.key, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="—"
                    className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-right text-base font-bold text-slate-900 outline-none focus:border-[#004225]"
                  />
                  <span className="w-8 text-xs font-bold text-slate-400">g</span>
                </span>
              </label>
            );
          })}
        </div>

        {error && <p className="mt-4 text-sm font-bold text-red-600">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl border border-slate-200 py-4 text-xs font-black uppercase tracking-widest text-slate-500 active:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-2xl bg-[#004225] py-4 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 active:scale-95"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
