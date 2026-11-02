"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import MobileNav from '../../components/MobileNav';
import Header from '../../components/Header';
import GoalsSheet from '../../components/log/GoalsSheet';
import { Bar } from '../../components/log/Bars';
import NutrientRow from '../../components/nutrition/NutrientRow';
import { fetchDay, NO_GOALS, type DayResult } from '../../lib/day-log';
import { fetchDayNutrients, type DayNutrients } from '../../lib/day-nutrients';
import { NUTRIENTS, dailyAmount, type NutrientDef, type NutrientGroup } from '../../lib/nutrients';
import { localDateKey, shiftDateKey, sumMacros, type Goals } from '../../lib/nutrition';

type Loaded = { day: DayResult; nutrients: DayNutrients };

const loadAll = async (date: string): Promise<Loaded> => {
  const [day, nutrients] = await Promise.all([fetchDay(date), fetchDayNutrients(date)]);
  return { day, nutrients };
};

function dateLabel(key: string, today: string) {
  if (key === today) return 'Today';
  if (key === shiftDateKey(today, -1)) return 'Yesterday';
  const [y, m, d] = key.split('-').map(Number);
  return format(new Date(y, m - 1, d), 'EEE, MMM d');
}

const SECTIONS: { group: NutrientGroup; title: string; note?: string }[] = [
  { group: 'vitamin', title: 'Vitamins' },
  { group: 'mineral', title: 'Minerals' },
  { group: 'limit', title: 'Keep under', note: 'Daily limits, not targets.' },
  { group: 'other', title: 'Also tracked' },
];

export default function NutritionPage() {
  const [today] = useState(() => localDateKey());
  const [date, setDate] = useState(today);
  const [data, setData] = useState<Loaded | null>(null);
  const [goalsOverride, setGoalsOverride] = useState<Goals | null>(null);
  const [showGoals, setShowGoals] = useState(false);

  const apply = useCallback((next: Loaded) => {
    setData(next);
    setGoalsOverride(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadAll(date).then((next) => {
      if (!cancelled) apply(next);
    });
    return () => {
      cancelled = true;
    };
  }, [date, apply]);

  const goals: Goals = goalsOverride ?? data?.day.goals ?? NO_GOALS;
  const entries = data?.day.entries ?? [];
  const totals = sumMacros(entries);
  const n = data?.nutrients;
  const ready = data !== null;

  // Where the calories came from, using 4 / 4 / 9 calories per gram.
  const fromP = totals.protein_g * 4;
  const fromC = totals.carbs_g * 4;
  const fromF = totals.fat_g * 9;
  const fromSum = fromP + fromC + fromF;
  const pct = (v: number) => (fromSum > 0 ? Math.round((v / fromSum) * 100) : 0);
  const goalSum = goals.protein_g != null && goals.carbs_g != null && goals.fat_g != null ? goals.protein_g * 4 + goals.carbs_g * 4 + goals.fat_g * 9 : 0;
  const goalPct = (grams: number | null, per: number) => (goalSum > 0 && grams != null ? Math.round(((grams * per) / goalSum) * 100) : null);

  const coverage = n && n.totalKcal > 0 ? n.fullKcal / n.totalKcal : 1;

  function rowsFor(group: NutrientGroup) {
    const defs = NUTRIENTS.filter((d) => d.group === group);
    const reported = defs.filter((d) => n?.totals[d.key]);
    const missing = defs.filter((d) => !n?.totals[d.key]);
    return { reported, missing };
  }

  const renderRow = (def: NutrientDef) => {
    const t = n!.totals[def.key];
    return (
      <NutrientRow
        key={def.key}
        label={def.label}
        amount={t.amount}
        unit={def.unit}
        daily={dailyAmount(def, goals.kcal)}
        limit={def.limit}
        atLeast={n!.totalKcal > 0 && t.kcalReported / n!.totalKcal < 0.9}
      />
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-white to-slate-100 pb-44 px-4 sm:px-6 pt-6 sm:pt-8">
      <div className="mx-auto max-w-2xl">
        <Header compact />

        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h1 className="page-title-brand text-3xl sm:text-4xl">Nutrition</h1>
            <Link href="/" className="text-[11px] font-black uppercase tracking-widest text-slate-400 underline underline-offset-2">
              ‹ Today
            </Link>
          </div>
          <div className="flex items-center rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            <button onClick={() => setDate((d) => shiftDateKey(d, -1))} aria-label="Previous day" className="h-10 w-10 rounded-xl text-lg font-black text-slate-500 active:bg-slate-100">
              ‹
            </button>
            <button onClick={() => setDate(today)} className="min-w-[5.5rem] px-1 text-xs font-black uppercase tracking-widest text-slate-900">
              {dateLabel(date, today)}
            </button>
            <button onClick={() => setDate((d) => shiftDateKey(d, 1))} disabled={date >= today} aria-label="Next day" className="h-10 w-10 rounded-xl text-lg font-black text-slate-500 disabled:opacity-25 active:bg-slate-100">
              ›
            </button>
          </div>
        </div>

        {/* Calories */}
        <section className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-4xl font-black leading-none text-slate-900">
                {ready ? Math.round(totals.kcal) : '—'}
                <span className="text-base font-bold text-slate-400"> {goals.kcal ? `/ ${Math.round(goals.kcal)} ` : ''}kcal</span>
              </p>
              {goals.kcal && ready ? (
                <p className={`mt-1 text-[10px] font-black uppercase tracking-widest ${totals.kcal > goals.kcal ? 'text-amber-600' : 'text-slate-400'}`}>
                  {totals.kcal > goals.kcal ? `${Math.round(totals.kcal - goals.kcal)} over` : `${Math.round(goals.kcal - totals.kcal)} left`}
                </p>
              ) : null}
            </div>
            <button onClick={() => setShowGoals(true)} className="shrink-0 rounded-full bg-slate-100 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 active:bg-slate-200">
              {goals.kcal ? 'Goals' : 'Set goals'}
            </button>
          </div>
          {goals.kcal ? <Bar value={totals.kcal} goal={goals.kcal} className="mt-3" /> : null}

          {/* Macros against goals */}
          <ul className="mt-2 divide-y divide-slate-50">
            {[
              { label: 'Protein', value: totals.protein_g, goal: goals.protein_g },
              { label: 'Carbs', value: totals.carbs_g, goal: goals.carbs_g },
              { label: 'Fat', value: totals.fat_g, goal: goals.fat_g },
            ].map((m) => (
              <NutrientRow key={m.label} label={m.label} amount={m.value} unit="g" daily={m.goal} />
            ))}
          </ul>
        </section>

        {/* Where the calories came from */}
        {fromSum > 0 && (
          <section className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Where your calories came from</p>
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Protein ${pct(fromP)}%, carbs ${pct(fromC)}%, fat ${pct(fromF)}%`}>
              <div className="bg-emerald-700" style={{ width: `${pct(fromP)}%` }} />
              <div className="bg-amber-400" style={{ width: `${pct(fromC)}%` }} />
              <div className="bg-sky-500" style={{ width: `${pct(fromF)}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Protein', dot: 'bg-emerald-700', value: pct(fromP), goal: goalPct(goals.protein_g, 4) },
                { label: 'Carbs', dot: 'bg-amber-400', value: pct(fromC), goal: goalPct(goals.carbs_g, 4) },
                { label: 'Fat', dot: 'bg-sky-500', value: pct(fromF), goal: goalPct(goals.fat_g, 9) },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-xl font-black text-slate-900">{s.value}%</p>
                  <p className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} /> {s.label}
                  </p>
                  {s.goal != null && <p className="text-[10px] font-bold text-slate-400">goal {s.goal}%</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {ready && entries.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm font-bold italic text-slate-400">
            Nothing logged {date === today ? 'yet today' : 'this day'}. Log a food to see vitamins and minerals.
          </p>
        ) : null}

        {/* Vitamins, minerals and the rest */}
        {n && entries.length > 0 && (
          <>
            {n.basicOnly.length > 0 && (
              <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
                <p className="font-bold">
                  Vitamins and minerals count {n.foodsFull} of {n.foodsTotal} foods ({Math.round(coverage * 100)}% of your calories).
                </p>
                <p className="mt-1 text-xs">The rest only have basic label data, so their vitamins and minerals aren’t in these totals. Numbers marked ≥ are at least that much.</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-black uppercase tracking-widest">Which foods</summary>
                  <ul className="mt-1.5 space-y-0.5 text-xs">
                    {n.basicOnly.map((f) => (
                      <li key={f.label} className="truncate">
                        {f.label} <span className="text-amber-700">· {Math.round(f.kcal)} kcal</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </section>
            )}

            {SECTIONS.map((section) => {
              const { reported, missing } = rowsFor(section.group);
              if (reported.length === 0 && missing.length === 0) return null;
              return (
                <section key={section.group} className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{section.title}</h2>
                    {section.note && <span className="text-[10px] font-bold text-slate-400">{section.note}</span>}
                  </div>
                  {reported.length > 0 ? (
                    <ul className="mt-1 divide-y divide-slate-50">{reported.map(renderRow)}</ul>
                  ) : (
                    <p className="mt-2 text-xs font-bold text-slate-400">None of today’s foods report these.</p>
                  )}
                  {missing.length > 0 && reported.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-slate-400">Not reported by your foods ({missing.length})</summary>
                      <p className="mt-1 text-xs font-medium text-slate-500">{missing.map((d) => d.label).join(' · ')}</p>
                    </details>
                  )}
                </section>
              );
            })}

            <p className="px-1 text-[11px] font-medium leading-relaxed text-slate-400">
              Suggested amounts are the FDA Daily Values used on US nutrition labels, set for adults eating 2,000 calories. Fiber follows your calorie goal. They are a general reference, not medical advice or a personal recommendation.
            </p>
          </>
        )}
      </div>

      {showGoals && (
        <GoalsSheet goals={goals} onClose={() => setShowGoals(false)} onSaved={(g) => setGoalsOverride(g)} />
      )}
      <MobileNav />
    </main>
  );
}
