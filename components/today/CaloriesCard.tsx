"use client";
import Link from 'next/link';
import { Bar } from '../log/Bars';
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

/** Today's calories against your goal on one slim card, with Log and Scan within thumb reach. */
export default function CaloriesCard({ entries, goals, ready, error, onEditGoals, onLog, onScan }: Props) {
  const totals = sumMacros(entries);
  const kcal = Math.round(totals.kcal);
  const left = goals.kcal ? Math.round(goals.kcal - totals.kcal) : null;
  const macro = (label: string, value: number, goal: number | null) => `${label} ${Math.round(value)}${goal ? `/${Math.round(goal)}` : ''}`;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Link href="/log" className="min-w-0 flex-1" aria-label="Open today's food log">
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

        <button
          onClick={onLog}
          aria-label="Log food"
          className="flex h-10 shrink-0 items-center gap-1 rounded-full bg-[#004225] pl-3 pr-4 text-[11px] font-black uppercase tracking-wider text-white active:scale-95"
        >
          <span className="text-base leading-none">+</span> Log
        </button>
        <button
          onClick={onScan}
          aria-label="Scan a barcode"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[#004225] pl-3 pr-4 text-[11px] font-black uppercase tracking-wider text-[#004225] active:scale-95"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8V6a2 2 0 012-2h2M17 4h2a2 2 0 012 2v2M21 16v2a2 2 0 01-2 2h-2M7 20H5a2 2 0 01-2-2v-2M7 8v8M11 8v8M14 8v8M17 8v8" />
          </svg>
          Scan
        </button>
      </div>

      {goals.kcal ? <Bar value={totals.kcal} goal={goals.kcal} className="mt-2.5 !h-1.5" /> : null}

      <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-500">
        <Link href="/log" className="min-w-0 truncate" tabIndex={-1}>
          {macro('P', totals.protein_g, goals.protein_g)} · {macro('C', totals.carbs_g, goals.carbs_g)} · {macro('F', totals.fat_g, goals.fat_g)} g
        </Link>
        <button onClick={onEditGoals} className="-my-2.5 shrink-0 py-2.5 pl-4 text-[10px] font-black uppercase tracking-widest text-slate-400 underline underline-offset-2 active:text-slate-700">
          {goals.kcal ? 'Goals' : 'Set goals'}
        </button>
      </div>
    </section>
  );
}
