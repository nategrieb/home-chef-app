"use client";
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Bar } from '../log/Bars';
import { sumMacros, type Goals, type LogEntry } from '../../lib/nutrition';

type Props = {
  entries: LogEntry[];
  goals: Goals;
  ready: boolean;
  error: string | null;
  onEditGoals: () => void;
  /** The day's meals, shown inside this card under the numbers. */
  children?: ReactNode;
};

/** Today's calories and macros against your goals, with the day's meals directly underneath in the same card. */
export default function CaloriesCard({ entries, goals, ready, error, onEditGoals, children }: Props) {
  const totals = sumMacros(entries);
  const kcal = Math.round(totals.kcal);
  const left = goals.kcal ? Math.round(goals.kcal - totals.kcal) : null;
  const macro = (label: string, value: number, goal: number | null) => `${label} ${Math.round(value)}${goal ? `/${Math.round(goal)}` : ''}`;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="px-4 pt-3 pb-3">
      <div className="flex items-center gap-2">
        <Link href="/nutrition" className="min-w-0 flex-1" aria-label="Open today's nutrition">
          {error && !ready ? (
            <p className="text-sm font-bold text-slate-400">Calories unavailable right now</p>
          ) : (
            <>
              <p className="truncate leading-none">
                <span className="text-2xl font-black text-slate-900">{ready ? kcal : '—'}</span>
                <span className="text-sm font-bold text-slate-400"> {goals.kcal ? `/ ${Math.round(goals.kcal)} ` : ''}kcal</span>
              </p>
              <p className={`mt-1 text-[10px] font-black uppercase tracking-widest ${left != null && left < 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                {left == null || !ready ? 'Calories today' : left < 0 ? `${Math.abs(left)} over` : `${left} left`}
              </p>
            </>
          )}
        </Link>

      </div>

      {goals.kcal ? <Bar value={totals.kcal} goal={goals.kcal} className="mt-2.5 !h-1.5" /> : null}

      <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-500">
        <Link href="/nutrition" className="min-w-0 truncate" tabIndex={-1}>
          {macro('P', totals.protein_g, goals.protein_g)} · {macro('C', totals.carbs_g, goals.carbs_g)} · {macro('F', totals.fat_g, goals.fat_g)} g
        </Link>
        <button onClick={onEditGoals} className="-my-2.5 shrink-0 py-2.5 pl-4 text-[10px] font-black uppercase tracking-widest text-slate-400 underline underline-offset-2 active:text-slate-700">
          {goals.kcal ? 'Goals' : 'Set goals'}
        </button>
      </div>
      </div>
      {children && <div className="border-t border-slate-100">{children}</div>}
    </section>
  );
}
