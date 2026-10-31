"use client";
import { useEffect, useState } from 'react';
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

type Props = {
  meal: MealSlot;
  date: string;
  onClose: () => void;
  onAdded: (entry: LogEntry) => void;
};

type Recent = { food: Food; lastGrams: number };

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold text-slate-900 outline-none focus:border-[#004225]';

const foodLabel = (food: Pick<Food, 'name' | 'brand'>) => (food.brand ? `${food.name} · ${food.brand}` : food.name);

export default function AddFoodSheet({ meal, date, onClose, onAdded }: Props) {
  const [view, setView] = useState<'search' | 'amount' | 'custom'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [recents, setRecents] = useState<Recent[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [gramsText, setGramsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mealChoice, setMealChoice] = useState<MealSlot>(meal);

  // Recent foods: one tap to log the same thing again, at the amount you last used.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('food_log')
        .select(`grams, created_at, food:foods (${FOOD_COLUMNS})`)
        .not('food_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(80);
      if (cancelled || !data) return;
      const seen = new Set<string>();
      const list: Recent[] = [];
      for (const row of data as unknown as { grams: number; food: Food | null }[]) {
        if (!row.food || seen.has(row.food.id)) continue;
        seen.add(row.food.id);
        list.push({ food: row.food, lastGrams: Number(row.grams) });
        if (list.length >= 10) break;
      }
      setRecents(list);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Search as you type (debounced).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const body = (await res.json()) as { foods?: Food[]; usda?: string; error?: string };
        setResults(body.foods ?? []);
        setNotice(
          body.error ??
            (body.usda === 'rate_limited'
              ? 'Food database is busy. Showing saved foods only; try again in a few minutes.'
              : body.usda === 'cache_failed'
                ? 'Couldn’t load new foods just now. Try the search again.'
                : body.usda === 'unavailable'
                ? 'Food database is unreachable. Showing saved foods only.'
                : null)
        );
      } catch {
        // Aborted by a newer keystroke, or offline.
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function choose(food: Food, grams?: number) {
    setSelected(food);
    setGramsText(grams ? String(grams) : food.serving_g ? String(food.serving_g) : '100');
    setError(null);
    setView('amount');
  }

  async function addEntry(food: Food, grams: number) {
    setSaving(true);
    setError(null);
    const macros = macrosForGrams(food, grams);
    const { data, error: insertError } = await supabase
      .from('food_log')
      .insert({ logged_on: date, meal: mealChoice, food_id: food.id, name: foodLabel(food), grams, ...macros })
      .select('*')
      .single();
    setSaving(false);
    if (insertError || !data) {
      setError(insertError?.message ?? 'Could not add that food.');
      return;
    }
    onAdded(data as LogEntry);
    onClose();
  }

  const grams = parseNumber(gramsText);
  const preview = selected && grams ? macrosForGrams(selected, grams) : null;
  const showResults = query.trim().length >= 2;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pb-3 pt-6">
          <h2 className="text-xl font-black text-slate-900">
            {view === 'custom' ? 'New food' : view === 'amount' ? 'How much?' : 'Add food'}
          </h2>
          <button onClick={onClose} aria-label="Close" className="h-10 w-10 rounded-full text-2xl font-black text-slate-400 active:bg-slate-100">
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
          <div className="mb-4 flex gap-1.5">
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
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search foods, e.g. lentils, greek yogurt"
                className={inputClass}
              />

              {notice && <p className="mt-3 text-xs font-bold text-amber-700">{notice}</p>}

              {!showResults && recents.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Recent</p>
                  <ul className="space-y-2">
                    {recents.map(({ food, lastGrams }) => (
                      <li key={food.id} className="flex items-center gap-2">
                        <button onClick={() => choose(food, lastGrams)} className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-4 py-3 text-left active:bg-slate-100">
                          <p className="truncate text-sm font-bold text-slate-900">{foodLabel(food)}</p>
                          <p className="text-xs font-bold text-slate-400">
                            {lastGrams} g · {Math.round(macrosForGrams(food, lastGrams).kcal)} kcal
                          </p>
                        </button>
                        <button
                          onClick={() => addEntry(food, lastGrams)}
                          disabled={saving}
                          aria-label={`Add ${lastGrams} g of ${food.name} again`}
                          className="h-12 w-12 shrink-0 rounded-2xl bg-[#004225] text-xl font-black text-white disabled:opacity-50 active:scale-95"
                        >
                          +
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {showResults && (
                <ul className="mt-4 space-y-2">
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
                  {searching && results.length === 0 && <li className="py-4 text-center text-sm font-bold text-slate-400">Searching…</li>}
                  {!searching && results.length === 0 && <li className="py-4 text-center text-sm font-bold text-slate-400">No matches yet.</li>}
                </ul>
              )}

              <button
                onClick={() => setView('custom')}
                className="mt-5 w-full rounded-2xl border-2 border-dashed border-slate-200 py-4 text-xs font-black uppercase tracking-widest text-slate-400 active:border-[#004225] active:text-[#004225]"
              >
                + Create a food
              </button>
            </>
          )}

          {view === 'amount' && selected && (
            <>
              <p className="text-base font-black text-slate-900">{foodLabel(selected)}</p>
              <p className="mt-1 text-xs font-bold text-slate-400">
                {Math.round(selected.kcal_100g)} kcal per 100 g
                {selected.serving_label ? ` · serving: ${selected.serving_label}` : ''}
              </p>

              <label className="mt-5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Amount in grams</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  autoFocus
                  inputMode="decimal"
                  value={gramsText}
                  onChange={(e) => setGramsText(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className={`${inputClass} text-2xl`}
                />
                <span className="text-lg font-black text-slate-400">g</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {[50, 100, 150, 200].map((g) => (
                  <button key={g} onClick={() => setGramsText(String(g))} className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 active:bg-slate-200">
                    {g} g
                  </button>
                ))}
                {selected.serving_g && (
                  <button onClick={() => setGramsText(String(selected.serving_g))} className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-black text-emerald-800 active:bg-emerald-200">
                    1 serving · {selected.serving_g} g
                  </button>
                )}
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

              {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}

              <div className="mt-5 flex gap-3">
                <button onClick={() => setView('search')} className="flex-1 rounded-2xl border border-slate-200 py-4 text-xs font-black uppercase tracking-widest text-slate-500 active:bg-slate-50">
                  Back
                </button>
                <button
                  onClick={() => grams && addEntry(selected, grams)}
                  disabled={!grams || saving}
                  className="flex-1 rounded-2xl bg-[#004225] py-4 text-xs font-black uppercase tracking-widest text-white disabled:opacity-40 active:scale-95"
                >
                  {saving ? 'Adding…' : 'Add'}
                </button>
              </div>
            </>
          )}

          {view === 'custom' && (
            <CustomFoodForm
              initialName={query.trim()}
              onCancel={() => setView('search')}
              onCreated={(food) => choose(food)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CustomFoodForm({ initialName, onCancel, onCreated }: { initialName: string; onCancel: () => void; onCreated: (food: Food) => void }) {
  const [name, setName] = useState(initialName);
  const [brand, setBrand] = useState('');
  const [v, setV] = useState({ kcal: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', sodium: '', serving: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((prev) => ({ ...prev, [key]: e.target.value }));

  async function save() {
    const kcal = parseNumber(v.kcal);
    if (!name.trim() || kcal == null) {
      setError('Add a name and the calories per 100 g.');
      return;
    }
    setSaving(true);
    setError(null);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setError('Sign in again to save foods.');
      setSaving(false);
      return;
    }
    const serving = parseNumber(v.serving);
    const { data, error: insertError } = await supabase
      .from('foods')
      .insert({
        source: 'custom',
        owner_id: auth.user.id,
        name: name.trim(),
        brand: brand.trim() || null,
        kcal_100g: kcal,
        protein_100g: parseNumber(v.protein) ?? 0,
        carbs_100g: parseNumber(v.carbs) ?? 0,
        fat_100g: parseNumber(v.fat) ?? 0,
        fiber_100g: parseNumber(v.fiber),
        sugar_100g: parseNumber(v.sugar),
        sodium_mg_100g: parseNumber(v.sodium),
        serving_g: serving,
        serving_label: serving ? `${serving} g` : null,
      })
      .select(FOOD_COLUMNS)
      .single();
    setSaving(false);
    if (insertError || !data) {
      setError(insertError?.message ?? 'Could not save that food.');
      return;
    }
    onCreated(data as Food);
  }

  const number = (label: string, key: keyof typeof v, unit: string) => (
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
      <label className="block">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} mt-1`} />
      </label>
      <label className="block">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Brand (optional)</span>
        <input value={brand} onChange={(e) => setBrand(e.target.value)} className={`${inputClass} mt-1`} />
      </label>

      <p className="pt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Nutrition per 100 g</p>
      <div className="grid grid-cols-2 gap-3">
        {number('Calories', 'kcal', 'kcal')}
        {number('Protein', 'protein', 'g')}
        {number('Carbs', 'carbs', 'g')}
        {number('Fat', 'fat', 'g')}
        {number('Fiber', 'fiber', 'g')}
        {number('Sugar', 'sugar', 'g')}
        {number('Sodium', 'sodium', 'mg')}
        {number('1 serving', 'serving', 'g')}
      </div>

      {error && <p className="text-sm font-bold text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 rounded-2xl border border-slate-200 py-4 text-xs font-black uppercase tracking-widest text-slate-500 active:bg-slate-50">
          Back
        </button>
        <button onClick={save} disabled={saving} className="flex-1 rounded-2xl bg-[#004225] py-4 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 active:scale-95">
          {saving ? 'Saving…' : 'Save food'}
        </button>
      </div>
    </div>
  );
}
