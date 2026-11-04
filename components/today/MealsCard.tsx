"use client";
import { useState } from 'react';
import { amountText } from '../../lib/portions';
import { MEALS, sumMacros, type LogEntry, type MealSlot } from '../../lib/nutrition';

type Props = {
  entries: LogEntry[];
  ready: boolean;
  onEdit: (entry: LogEntry) => void;
  onAdd: (meal: MealSlot) => void;
};

/** Today's meals, right under the calories: each meal is one row that opens to show what was logged. */
export default function MealsCard({ entries, ready, onEdit, onAdd }: Props) {
  const [open, setOpen] = useState<Set<MealSlot>>(new Set());
  if (!ready) return null;

  const toggle = (meal: MealSlot) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(meal)) next.delete(meal);
      else next.add(meal);
      return next;
    });

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <ul className="divide-y divide-slate-50">
        {MEALS.map((meal) => {
          const mealEntries = entries.filter((e) => e.meal === meal.key);
          const kcal = Math.round(sumMacros(mealEntries).kcal);
          const isOpen = open.has(meal.key) && mealEntries.length > 0;
          const preview = mealEntries.map((e) => e.name.split('·')[0].split(',')[0].trim()).join(', ');
          return (
            <li key={meal.key}>
              <div className="flex items-center">
                <button
                  onClick={() => mealEntries.length > 0 && toggle(meal.key)}
                  aria-expanded={isOpen}
                  aria-label={`${meal.label}, ${mealEntries.length} item${mealEntries.length === 1 ? '' : 's'}`}
                  className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-5 text-left"
                >
                  <span className="w-[4.5rem] shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-400">{meal.label}</span>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-500">{mealEntries.length > 0 ? preview : '—'}</span>
                  <span className="shrink-0 text-sm font-black tabular-nums text-slate-800">{mealEntries.length > 0 ? kcal : ''}</span>
                  {mealEntries.length > 0 && (
                    <svg className={`h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 9l6 6 6-6" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => onAdd(meal.key)}
                  aria-label={`Add food to ${meal.label}`}
                  className="mr-2 h-10 w-10 shrink-0 rounded-xl text-xl font-black text-slate-400 active:bg-slate-100 active:text-[#004225]"
                >
                  +
                </button>
              </div>

              {isOpen && (
                <ul className="border-t border-slate-50 bg-slate-50/50">
                  {mealEntries.map((entry) => (
                    <li key={entry.id}>
                      <button onClick={() => onEdit(entry)} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left active:bg-slate-100">
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
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
