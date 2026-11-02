"use client";
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FOOD_COLUMNS, parseNumber, type Food } from '../../lib/nutrition';
import { servingPortion } from '../../lib/portions';
import FoodPicker from '../recipes/FoodPicker';

/** What the form starts with: typed text, or what a barcode lookup learned. */
export type CustomStart = {
  name: string;
  brand: string;
  /** What gets saved on the food: the digits, or an item key for price-coded store labels. */
  barcode: string | null;
  /** The number the scanner actually read, shown so a misread is easy to spot. */
  scanned: string | null;
  servingG: number | null;
  notice: string | null;
};

type Props = {
  start: CustomStart;
  /** A food you made earlier, being corrected. */
  existing?: Food;
  onCancel: () => void;
  onSaved: (food: Food) => void;
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold text-slate-900 outline-none focus:border-[#004225]';

const round = (n: number, digits = 1) => Math.round(n * 10 ** digits) / 10 ** digits;
// Per-100 g values are saved to 2 decimals, so converting back to a serving can leave a trace (260.0064); tidy that
// to the shortest number that is still the same to within rounding (260).
const show = (n: number | null | undefined) => {
  if (n == null) return '';
  const tenth = round(n, 1);
  return String(Math.abs(n - tenth) < 0.02 ? tenth : round(n, 2));
};

type Basis = 'serving' | 'hundred';
type Values = { kcal: string; protein: string; carbs: string; fat: string; fiber: string; sugar: string; sodium: string };

/**
 * Create or correct a food from its nutrition label. Labels list nutrition per serving (US) or per 100 g (elsewhere):
 * pick whichever the label uses and type the numbers as printed. The app converts to per 100 g for you.
 */
export default function FoodForm({ start, existing, onCancel, onSaved }: Props) {
  const own = existing ? servingPortion(existing) : null;
  const [basis, setBasis] = useState<Basis>(existing ? (existing.serving_g ? 'serving' : 'hundred') : 'serving');
  const [name, setName] = useState(existing?.name ?? start.name);
  const [brand, setBrand] = useState(existing?.brand ?? start.brand);
  const [servingG, setServingG] = useState(existing?.serving_g ? String(existing.serving_g) : start.servingG ? String(start.servingG) : '');
  const [servingName, setServingName] = useState(own && own.label !== 'serving' ? own.label : '');
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When correcting a food, show its numbers the way the label would: per serving if it has one.
  const factorOnOpen = existing?.serving_g ? existing.serving_g / 100 : 1;
  const open = (n: number | null | undefined) => (existing && n != null ? show(n * factorOnOpen) : '');
  const [v, setV] = useState<Values>({
    kcal: open(existing?.kcal_100g),
    protein: open(existing?.protein_100g),
    carbs: open(existing?.carbs_100g),
    fat: open(existing?.fat_100g),
    fiber: open(existing?.fiber_100g),
    sugar: open(existing?.sugar_100g),
    sodium: open(existing?.sodium_mg_100g),
  });
  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) => setV((prev) => ({ ...prev, [key]: e.target.value }));

  const serving = parseNumber(servingG);
  // Multiply what's typed by this to get per 100 g.
  const toPer100 = basis === 'serving' ? (serving && serving > 0 ? 100 / serving : null) : 1;
  const per100 = (text: string) => {
    const n = parseNumber(text);
    return n != null && toPer100 != null ? round(n * toPer100, 2) : null;
  };
  const kcal100 = per100(v.kcal);
  const kcalPerServing = kcal100 != null && serving ? round((kcal100 * serving) / 100, 0) : null;

  async function save() {
    if (!name.trim()) return setError('Give the food a name.');
    if (basis === 'serving' && (!serving || serving <= 0)) return setError('Enter the serving size in grams. It’s at the top of the label, e.g. “1 cup (148 g)”.');
    if (kcal100 == null) return setError('Enter the calories from the label.');

    setSaving(true);
    setError(null);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setError('Sign in again to save foods.');
      setSaving(false);
      return;
    }

    const row = {
      name: name.trim(),
      brand: brand.trim() || null,
      kcal_100g: kcal100,
      protein_100g: per100(v.protein) ?? 0,
      carbs_100g: per100(v.carbs) ?? 0,
      fat_100g: per100(v.fat) ?? 0,
      fiber_100g: per100(v.fiber),
      sugar_100g: per100(v.sugar),
      sodium_mg_100g: per100(v.sodium),
      serving_g: serving && serving > 0 ? serving : null,
      // "1 bar", "1 slice": the unit name is what the amount screen offers next to grams.
      serving_label: serving && serving > 0 ? (servingName.trim() ? `1 ${servingName.trim().toLowerCase()}` : `${serving} g`) : null,
    };

    const query = existing
      ? supabase.from('foods').update(row).eq('id', existing.id)
      : supabase.from('foods').insert({ ...row, source: 'custom', owner_id: auth.user.id, barcode: start.barcode });
    const { data, error: saveError } = await query.select(FOOD_COLUMNS).single();
    setSaving(false);
    if (saveError || !data) {
      setError(saveError?.message ?? 'Could not save that food.');
      return;
    }
    onSaved(data as Food);
  }

  /** Remember this barcode for a food you already have, instead of creating a second one. */
  async function attachTo(food: Food) {
    if (!start.barcode) return;
    setPicking(false);
    setSaving(true);
    setError(null);
    const { error: linkError } = await supabase.from('food_barcodes').upsert({ barcode: start.barcode, food_id: food.id }, { onConflict: 'owner_id,barcode' });
    setSaving(false);
    if (linkError) {
      setError(linkError.message.includes('food_barcodes') ? 'Barcode links aren’t set up yet. Run add-food-barcodes.sql in Supabase.' : linkError.message);
      return;
    }
    onSaved(food);
  }

  const number = (label: string, key: keyof Values, unit: string) => (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <input inputMode="decimal" value={v[key]} onChange={set(key)} className={inputClass} />
        <span className="w-7 text-xs font-bold text-slate-400">{unit}</span>
      </span>
    </label>
  );

  return (
    <div className="space-y-3">
      {start.notice && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
          {start.scanned && <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-amber-700">Scanned {start.scanned}</p>}
          <p>{start.notice}</p>
        </div>
      )}
      {start.barcode && !existing && (
        <button
          onClick={() => setPicking(true)}
          className="w-full rounded-2xl border-2 border-dashed border-slate-300 py-3.5 text-xs font-black uppercase tracking-widest text-slate-600 active:border-[#004225] active:text-[#004225]"
        >
          It’s a food I already have
        </button>
      )}

      <label className="block">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} mt-1`} />
      </label>
      <label className="block">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Brand (optional)</span>
        <input value={brand} onChange={(e) => setBrand(e.target.value)} className={`${inputClass} mt-1`} />
      </label>

      <p className="pt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">The label lists nutrition…</p>
      <div className="flex gap-1.5">
        {([
          ['serving', 'Per serving'],
          ['hundred', 'Per 100 g'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setBasis(key)}
            aria-pressed={basis === key}
            className={`flex-1 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider ${basis === key ? 'bg-[#004225] text-white' : 'bg-slate-100 text-slate-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{basis === 'serving' ? 'Serving size' : 'One serving (optional)'}</span>
          <span className="mt-1 flex items-center gap-2">
            <input inputMode="decimal" value={servingG} onChange={(e) => setServingG(e.target.value)} placeholder="148" className={inputClass} />
            <span className="w-7 text-xs font-bold text-slate-400">g</span>
          </span>
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Called (optional)</span>
          <input value={servingName} onChange={(e) => setServingName(e.target.value)} placeholder="bar, slice, cup" className={`${inputClass} mt-1`} />
        </label>
      </div>
      {basis === 'serving' && <p className="-mt-1 text-xs font-bold text-slate-400">The grams are on the label next to the serving size, e.g. “1 cup (148 g)”.</p>}

      <p className="pt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Nutrition {basis === 'serving' ? `per serving${serving ? ` (${serving} g)` : ''}` : 'per 100 g'}</p>
      <div className="grid grid-cols-2 gap-3">
        {number('Calories', 'kcal', 'kcal')}
        {number('Protein', 'protein', 'g')}
        {number('Carbs', 'carbs', 'g')}
        {number('Fat', 'fat', 'g')}
        {number('Fiber', 'fiber', 'g')}
        {number('Sugar', 'sugar', 'g')}
        {number('Sodium', 'sodium', 'mg')}
      </div>

      {kcal100 != null && (
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600">
          {basis === 'serving' && kcalPerServing != null && (
            <p>
              One serving ({serving} g) = <span className="text-slate-900">{kcalPerServing} kcal</span>
            </p>
          )}
          <p>
            Saved as <span className="text-slate-900">{round(kcal100, 0)} kcal</span> per 100 g
          </p>
        </div>
      )}

      {error && <p className="text-sm font-bold text-red-600">{error}</p>}

      {picking && <FoodPicker title="Which food is it?" onPick={attachTo} onClose={() => setPicking(false)} />}

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 rounded-2xl border border-slate-200 py-4 text-xs font-black uppercase tracking-widest text-slate-500 active:bg-slate-50">
          Back
        </button>
        <button onClick={save} disabled={saving} className="flex-1 rounded-2xl bg-[#004225] py-4 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 active:scale-95">
          {saving ? 'Saving…' : existing ? 'Save changes' : 'Save food'}
        </button>
      </div>
    </div>
  );
}
