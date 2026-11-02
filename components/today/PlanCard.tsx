"use client";
import Link from 'next/link';
import type { PlanItem } from '../../lib/today';

/** What's planned for today. Only shown when something is planned. */
export default function PlanCard({ items, onLog }: { items: PlanItem[]; onLog: (recipeId: string) => void }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Today’s plan</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <Link href={`/recipes/${item.recipeId}`} className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-4 py-3 active:bg-slate-100">
              <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
              {item.category && <p className="text-xs font-bold text-slate-400">{item.category}</p>}
            </Link>
            {item.hasNutrition && (
              <button onClick={() => onLog(item.recipeId)} className="shrink-0 rounded-2xl bg-[#004225] px-4 py-3.5 text-xs font-black uppercase tracking-widest text-white active:scale-95">
                Log
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
