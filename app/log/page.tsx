"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import MobileNav from '../../components/MobileNav';
import Header from '../../components/Header';
import AddFoodSheet from '../../components/log/AddFoodSheet';
import GoalsSheet from '../../components/log/GoalsSheet';
import SaveRecipeSheet from '../../components/log/SaveRecipeSheet';
import EditEntrySheet from '../../components/log/EditEntrySheet';
import { copyEntriesToDay } from '../../lib/relog';
import { toast } from '../../lib/toast';
import { Bar, Macro } from '../../components/log/Bars';
import { NO_GOALS, fetchDay, scaledAmount, toEntry, type DayResult } from '../../lib/day-log';
import { amountText } from '../../lib/portions';
import {
  MEALS,
  localDateKey,
  shiftDateKey,
  sumMacros,
  type Goals,
  type LogEntry,
  type MealSlot,
} from '../../lib/nutrition';

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
  // From an earlier day: log this food again (today, in whichever meal you choose).
  const [relog, setRelog] = useState<LogEntry | null>(null);
  const [savingMeal, setSavingMeal] = useState<MealSlot | null>(null);
  const [copying, setCopying] = useState<MealSlot | null>(null);
  const isPast = date < today;

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
    const next = scaledAmount(entry, amount);
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, ...next } : e)));
    setEditing(null);
    const { error } = await supabase.from('food_log').update(next).eq('id', entry.id);
    if (error) reload();
  }

  async function copyMeal(meal: MealSlot, mealEntries: LogEntry[]) {
    setCopying(meal);
    const { error } = await copyEntriesToDay(mealEntries, today);
    setCopying(null);
    toast(error ? 'Couldn’t copy that meal' : `Copied ${mealEntries.length} item${mealEntries.length === 1 ? '' : 's'} to today’s ${MEALS.find((m) => m.key === meal)?.label}`);
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
        <Link href="/nutrition" className="mt-4 block text-center text-[11px] font-black uppercase tracking-widest text-[#004225] active:opacity-60">
          Vitamins, minerals and more ›
        </Link>
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
                    <div className="flex items-center gap-2 pr-3">
                      <button onClick={() => setEditing(entry)} className="flex min-w-0 flex-1 items-center justify-between gap-3 py-4 pl-5 text-left active:bg-slate-50">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-slate-900">{entry.name}</span>
                          <span className="block text-xs font-bold text-slate-400">
                            {amountText(entry)} · {Math.round(entry.protein_g)}P {Math.round(entry.carbs_g)}C {Math.round(entry.fat_g)}F
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-black text-slate-700">{Math.round(entry.kcal)}</span>
                      </button>
                      {isPast && (
                        <button
                          onClick={() => setRelog(entry)}
                          aria-label={`Log ${entry.name} again`}
                          className="shrink-0 rounded-xl bg-[#004225] px-3.5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white active:scale-95"
                        >
                          Log
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {mealEntries.length > 0 && (
                <div className="flex gap-2 border-t border-slate-50 px-3 pt-3">
                  {isPast && (
                    <button
                      onClick={() => copyMeal(meal.key, mealEntries)}
                      disabled={copying === meal.key}
                      className="flex-1 rounded-xl bg-slate-100 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-50 active:bg-slate-200"
                    >
                      {copying === meal.key ? 'Copying…' : 'Copy to today'}
                    </button>
                  )}
                  <button
                    onClick={() => setSavingMeal(meal.key)}
                    className="flex-1 rounded-xl bg-slate-100 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 active:bg-slate-200"
                  >
                    Save as recipe
                  </button>
                </div>
              )}
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
      {relog && <AddFoodSheet meal={relog.meal} date={today} initialEntry={relog} onClose={() => setRelog(null)} onAdded={() => {}} />}
      {savingMeal && (
        <SaveRecipeSheet
          entries={entries.filter((e) => e.meal === savingMeal)}
          meal={savingMeal}
          dateLabel={(() => { const [y, m, d] = date.split('-').map(Number); return format(new Date(y, m - 1, d), 'MMM d'); })()}
          onClose={() => setSavingMeal(null)}
        />
      )}
      {showGoals && <GoalsSheet goals={goals} onClose={() => setShowGoals(false)} onSaved={setGoals} />}
      {editing && <EditEntrySheet entry={editing} onClose={() => setEditing(null)} onSave={changeAmount} onDelete={removeEntry} />}

      <MobileNav />
    </main>
  );
}
