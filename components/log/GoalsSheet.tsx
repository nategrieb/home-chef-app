"use client";
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { parseNumber, type Goals } from '../../lib/nutrition';

type Props = {
  goals: Goals;
  onClose: () => void;
  onSaved: (goals: Goals) => void;
};

const FIELDS: { key: keyof Goals; label: string; unit: string }[] = [
  { key: 'kcal', label: 'Calories', unit: 'kcal' },
  { key: 'protein_g', label: 'Protein', unit: 'g' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g' },
  { key: 'fat_g', label: 'Fat', unit: 'g' },
];

export default function GoalsSheet({ goals, onClose, onSaved }: Props) {
  const [values, setValues] = useState<Record<keyof Goals, string>>({
    kcal: goals.kcal != null ? String(goals.kcal) : '',
    protein_g: goals.protein_g != null ? String(goals.protein_g) : '',
    carbs_g: goals.carbs_g != null ? String(goals.carbs_g) : '',
    fat_g: goals.fat_g != null ? String(goals.fat_g) : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      kcal: parseNumber(values.kcal),
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

        <div className="mt-5 space-y-3">
          {FIELDS.map((field) => (
            <label key={field.key} className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-slate-700">{field.label}</span>
              <span className="flex items-center gap-2">
                <input
                  inputMode="decimal"
                  value={values[field.key]}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder="—"
                  className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-right text-base font-bold text-slate-900 outline-none focus:border-[#004225]"
                />
                <span className="w-8 text-xs font-bold text-slate-400">{field.unit}</span>
              </span>
            </label>
          ))}
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
