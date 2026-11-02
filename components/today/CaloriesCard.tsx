"use client";
import Link from 'next/link';
import { Bar, Macro } from '../log/Bars';
import { sumMacros, type Goals, type LogEntry } from '../../lib/nutrition';

type Props = {
  entries: LogEntry[];
  goals: Goals;
  ready: boolean;
  error: string | null;
  onEditGoals: () => void;
  onLog: () => void;
  onScan: () => void;
};

/** Today's calories and macros against your goals, with the two ways to log something in one tap. */
export default function CaloriesCard({ entries, goals, ready, error, onEditGoals, onLog, onScan }: Props) {
  const totals = sumMacros(entries);
  const kcal = Math.round(totals.kcal);
  const left = goals.kcal ? Math.round(goals.kcal - totals.kcal) : null;

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Link href="/log" className="min-w-0 flex-1" aria-label="Open today's food log">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Calories today</p>
          {error && !ready ? (
            <p className="mt-1 text-sm font-bold text-slate-400">Calories unavailable right now</p>
          ) : (
            <>
              <p className="mt-1 text-4xl font-black text-slate-900">
                {ready ? kcal : '—'}
                {goals.kcal ? <span className="text-base font-bold text-slate-400"> / {Math.round(goals.kcal)} kcal</span> : <span className="text-base font-bold text-slate-400"> kcal</span>}
              </p>
              {left != null && ready && (
                <p className={`text-xs font-black uppercase tracking-widest ${left < 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {left < 0 ? `${Math.abs(left)} over` : `${left} left`}
                </p>
              )}
            </>
          )}
        </Link>
        <button onClick={onEditGoals} className="shrink-0 rounded-full bg-slate-100 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 active:bg-slate-200">
          {goals.kcal ? 'Goals' : 'Set goals'}
        </button>
      </div>

      {goals.kcal ? <Bar value={totals.kcal} goal={goals.kcal} className="mt-3" /> : null}

      <Link href="/log" className="mt-4 grid grid-cols-3 gap-4" tabIndex={-1} aria-hidden="true">
        <Macro label="Protein" value={totals.protein_g} goal={goals.protein_g} />
        <Macro label="Carbs" value={totals.carbs_g} goal={goals.carbs_g} />
        <Macro label="Fat" value={totals.fat_g} goal={goals.fat_g} />
      </Link>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button onClick={onLog} className="rounded-2xl bg-[#004225] py-4 text-xs font-black uppercase tracking-widest text-white active:scale-95">
          + Log food
        </button>
        <button
          onClick={onScan}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#004225] py-4 text-xs font-black uppercase tracking-widest text-[#004225] active:scale-95"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8V6a2 2 0 012-2h2M17 4h2a2 2 0 012 2v2M21 16v2a2 2 0 01-2 2h-2M7 20H5a2 2 0 01-2-2v-2M7 8v8M11 8v8M14 8v8M17 8v8" />
          </svg>
          Scan
        </button>
      </div>
    </section>
  );
}
