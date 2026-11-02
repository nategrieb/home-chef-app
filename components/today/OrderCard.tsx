"use client";
import Link from 'next/link';
import type { ActiveOrder } from '../../lib/today';

/** The household's active kitchen order. Only shown while one exists. */
export default function OrderCard({ order }: { order: ActiveOrder | null }) {
  if (!order) return null;
  return (
    <Link href="/submit-order" className="flex items-center justify-between gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm active:bg-amber-100">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Kitchen order</p>
        <p className="truncate text-base font-black text-slate-900">{order.title}</p>
        <p className="text-xs font-bold text-slate-500">Updated {new Date(order.updatedAt).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</p>
      </div>
      <svg className="h-5 w-5 shrink-0 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
