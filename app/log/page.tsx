"use client";
import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import MobileNav from '../../components/MobileNav';
import Header from '../../components/Header';
import AddFoodSheet from '../../components/log/AddFoodSheet';
import GoalsSheet from '../../components/log/GoalsSheet';
import { amountText } from '../../lib/portions';
import {
  MEALS,
  localDateKey,
  parseNumber,
  shiftDateKey,
  sumMacros,
  type Goals,
  type LogEntry,
  type MealSlot,
} from '../../lib/nutrition';

const NO_GOALS: Goals = { kcal: null, protein_g: null, carbs_g: null, fat_g: null };

// numeric columns can arrive as strings depending on the driver; normalise once.
function toEntry(row: Record<string, unknown>): LogEntry {
  return {
    ...(row as unknown as LogEntry),
    grams: Number(row.grams),
    quantity: row.quantity != null ? Number(row.quantity) : null,
    portion_label: (row.portion_label as string | null) ?? null,
    kcal: Number(row.kcal),
    protein_g: Number(row.protein_g),
    carbs_g: Number(row.carbs_g),
    fat_g: Number(row.fat_g),
  };
}

type DayResult = { entries: LogEntry[]; goals: Goals | null; error: string | null };

async function fetchDay(day: string): Promise<DayResult> {
  const [log, goalRow] = await Promise.all([
    supabase.from('food_log').select('*').eq('logged_on', day).order('created_at'),
    supabase.from('nutrition_goals').select('kcal, protein_g, carbs_g, fat_g').maybeSingle(),
  ]);
  const goals: Goals | null = goalRow.data
    ? {
        kcal: goalRow.data.kcal != null ? Number(goalRow.data.kcal) : null,
        protein_g: goalRow.data.protein_g != null ? Number(goalRow.data.protein_g) : null,
        carbs_g: goalRow.data.carbs_g != null ? Number(goalRow.data.carbs_g) : null,
        fat_g: goalRow.data.fat_g != null ? Number(goalRow.data.fat_g) : null,
      }
    : null;
  return {
    entries: log.error ? [] : (log.data ?? []).map(toEntry),
    goals,
    error: log.error?.message ?? null,
  };
}

function dateLabel(key: string, today: string) {
  if (key === today) return 'Today';
  if (key === shiftDateKey(today, -1)) return 'Yesterday';
  const [y, m, d] = key.split('-').map(Number);
  return format(new Date(y, m - 1, d), 'EEE, MMM d');
}

export default function LogPage() {
  const [today] = useState(() => localDateKey());
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [goals, setGoals] = useState<Goals>(NO_GOALS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addMeal, setAddMeal] = useState<MealSlot | null>(null);
  const [showGoals, setShowGoals] = useState(false);
  const [editing, setEditing] = useState<LogEntry | null>(null);

  const applyDay = useCallback((result: DayResult) => {
    setEntries(result.entries);
    setLoadError(result.error);
    if (result.goals) setGoals(result.goals);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchDay(date).then((result) => {
      if (!cancelled) applyDay(result);
    });
    return () => {
      cancelled = true;
    };
  }, [date, applyDay]);

  const reload = () => fetchDay(date).then(applyDay);

  const totals = sumMacros(entries);

  async function removeEntry(entry: LogEntry) {
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    setEditing(null);
    const { error } = await supabase.from('food_log').delete().eq('id', entry.id);
    if (error) reload();
  }

  async function changeAmount(entry: LogEntry, amount: { grams: number; quantity: number | null; portion_label: string | null }) {
    // Scale the saved totals, so edits work the same for foods, custom foods and recipes.
    const f = amount.grams / entry.grams;
    const next = {
      ...amount,
      kcal: Math.round(entry.kcal * f * 10) / 10,
      protein_g: Math.round(entry.protein_g * f * 10) / 10,
      carbs_g: Math.round(entry.carbs_g * f * 10) / 10,
      fat_g: Math.round(entry.fat_g * f * 10) / 10,
    };
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, ...next } : e)));
    setEditing(null);
    const { error } = await supabase.from('food_log').update(next).eq('id', entry.id);
    if (error) reload();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-white to-slate-100 pb-44 px-4 sm:px-6 pt-8 sm:pt-10">
      <Header />

      <div className="mb-6">
        <h1 className="page-title-brand text-3xl sm:text-4xl">Log</h1>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Calories &amp; macros</p>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
        <button onClick={() => setDate((d) => shiftDateKey(d, -1))} aria-label="Previous day" className="h-12 w-12 rounded-xl text-xl font-black text-slate-500 active:bg-slate-100">
          ‹
        </button>
        <button onClick={() => setDate(today)} className="text-sm font-black uppercase tracking-widest text-slate-900">
          {dateLabel(date, today)}
        </button>
        <button
          onClick={() => setDate((d) => shiftDateKey(d, 1))}
          disabled={date >= today}
          aria-label="Next day"
          className="h-12 w-12 rounded-xl text-xl font-black text-slate-500 disabled:opacity-25 active:bg-slate-100"
        >
          ›
        </button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          Couldn’t load your log ({loadError}). If this is the first time, run <code>add-calorie-tracking.sql</code> in Supabase.
        </div>
      )}

      <section className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-4xl font-black text-slate-900">{Math.round(totals.kcal)}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {goals.kcal ? `of ${Math.round(goals.kcal)} kcal · ${Math.round(goals.kcal - totals.kcal)} left` : 'kcal'}
            </p>
          </div>
          <button onClick={() => setShowGoals(true)} className="rounded-full bg-slate-100 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 active:bg-slate-200">
            {goals.kcal ? 'Goals' : 'Set goals'}
          </button>
        </div>

        {goals.kcal ? <Bar value={totals.kcal} goal={goals.kcal} className="mt-3" /> : null}

        <div className="mt-5 grid grid-cols-3 gap-4">
          <Macro label="Protein" value={totals.protein_g} goal={goals.protein_g} />
          <Macro label="Carbs" value={totals.carbs_g} goal={goals.carbs_g} />
          <Macro label="Fat" value={totals.fat_g} goal={goals.fat_g} />
        </div>
      </section>

      <div className="space-y-5">
        {MEALS.map((meal) => {
          const mealEntries = entries.filter((e) => e.meal === meal.key);
          const mealKcal = sumMacros(mealEntries).kcal;
          return (
            <section key={meal.key} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>{meal.label}</span>
                <span>{Math.round(mealKcal)} kcal</span>
              </div>
              <ul className="divide-y divide-slate-50">
                {mealEntries.map((entry) => (
                  <li key={entry.id}>
                    <button onClick={() => setEditing(entry)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left active:bg-slate-50">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-900">{entry.name}</span>
                        <span className="block text-xs font-bold text-slate-400">
                          {amountText(entry)} · {Math.round(entry.protein_g)}P {Math.round(entry.carbs_g)}C {Math.round(entry.fat_g)}F
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-black text-slate-700">{Math.round(entry.kcal)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="p-3">
                <button
                  onClick={() => setAddMeal(meal.key)}
                  className="w-full rounded-2xl border-2 border-dashed border-slate-200 py-3.5 text-xs font-black uppercase tracking-widest text-slate-400 active:border-[#004225] active:text-[#004225]"
                >
                  + Add food
                </button>
              </div>
            </section>
          );
        })}
      </div>

      {loading && <p className="mt-6 text-center text-sm font-bold text-slate-400">Loading…</p>}

      {addMeal && (
        <AddFoodSheet
          meal={addMeal}
          date={date}
          onClose={() => setAddMeal(null)}
          onAdded={(entry) => setEntries((prev) => [...prev, toEntry(entry as unknown as Record<string, unknown>)])}
        />
      )}
      {showGoals && <GoalsSheet goals={goals} onClose={() => setShowGoals(false)} onSaved={setGoals} />}
      {editing && <EditEntrySheet entry={editing} onClose={() => setEditing(null)} onSave={changeAmount} onDelete={removeEntry} />}

      <MobileNav />
    </main>
  );
}

function Bar({ value, goal, className = '' }: { value: number; goal: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, (value / goal) * 100));
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div className={`h-full rounded-full ${value > goal ? 'bg-amber-500' : 'bg-[#004225]'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Macro({ label, value, goal }: { label: string; value: number; goal: number | null }) {
  return (
    <div>
      <p className="text-lg font-black text-slate-900">
        {Math.round(value)}
        <span className="text-xs font-bold text-slate-400">{goal ? ` / ${Math.round(goal)}` : ''} g</span>
      </p>
      <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      {goal ? <Bar value={value} goal={goal} /> : null}
    </div>
  );
}

function EditEntrySheet({
  entry,
  onClose,
  onSave,
  onDelete,
}: {
  entry: LogEntry;
  onClose: () => void;
  onSave: (entry: LogEntry, amount: { grams: number; quantity: number | null; portion_label: string | null }) => void;
  onDelete: (entry: LogEntry) => void;
}) {
  // Entries logged as "2 × large egg" are edited in eggs; "Use grams" switches to weight.
  const counted = Boolean(entry.portion_label && entry.quantity);
  const [byGrams, setByGrams] = useState(!counted);
  const [text, setText] = useState(String(byGrams ? entry.grams : entry.quantity));
  const value = parseNumber(text);
  const gramsPerUnit = counted ? entry.grams / (entry.quantity as number) : 1;
  const newGrams = value ? Math.round(value * (byGrams ? 1 : gramsPerUnit) * 10) / 10 : null;

  function switchMode(toGrams: boolean) {
    setByGrams(toGrams);
    setText(String(toGrams ? entry.grams : entry.quantity));
  }

  function save() {
    if (!value || !newGrams || newGrams <= 0) return;
    onSave(entry, byGrams ? { grams: newGrams, quantity: null, portion_label: null } : { grams: newGrams, quantity: value, portion_label: entry.portion_label });
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="truncate text-lg font-black text-slate-900">{entry.name}</h2>
        <label className="mt-4 block text-[10px] font-black uppercase tracking-widest text-slate-400">
          {byGrams ? 'Amount in grams' : `How many ${entry.portion_label}`}
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            autoFocus
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-2xl font-bold text-slate-900 outline-none focus:border-[#004225]"
          />
          <span className="shrink-0 text-lg font-black text-slate-400">{byGrams ? 'g' : '×'}</span>
        </div>
        <p className="mt-2 text-sm font-bold text-slate-400">
          {newGrams ? `= ${newGrams} g` : ' '}
          {counted && (
            <button onClick={() => switchMode(!byGrams)} className="ml-3 underline">
              {byGrams ? `Use ${entry.portion_label}` : 'Use grams'}
            </button>
          )}
        </p>
        <div className="mt-5 flex gap-3">
          <button onClick={() => onDelete(entry)} className="rounded-2xl bg-red-50 px-5 py-4 text-xs font-black uppercase tracking-widest text-red-600 active:scale-95">
            Delete
          </button>
          <button
            onClick={save}
            disabled={!newGrams || newGrams <= 0}
            className="flex-1 rounded-2xl bg-[#004225] py-4 text-xs font-black uppercase tracking-widest text-white disabled:opacity-40 active:scale-95"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
