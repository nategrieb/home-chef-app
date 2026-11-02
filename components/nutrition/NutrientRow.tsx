"use client";
import { formatAmount, type DisplayUnit } from '../../lib/nutrients';

type Props = {
  label: string;
  amount: number;
  unit: DisplayUnit;
  /** Suggested amount for the day, or the limit. Null shows the amount alone. */
  daily: number | null;
  limit?: boolean;
  /** Some of what you ate doesn't report this nutrient, so the real amount is at least this much. */
  atLeast?: boolean;
};

/** One nutrient: what you've had against the suggested amount (or limit), as a number and a bar. */
export default function NutrientRow({ label, amount, unit, daily, limit = false, atLeast = false }: Props) {
  const pct = daily ? (amount / daily) * 100 : null;
  const over = limit && pct != null && pct > 100;

  return (
    <li className="py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-bold text-slate-800">{label}</span>
        <span className="shrink-0 text-xs font-bold tabular-nums text-slate-500">
          <span className={over ? 'text-amber-600' : 'text-slate-900'}>
            {atLeast ? '≥ ' : ''}
            {formatAmount(amount, unit)}
          </span>
          {daily ? <span> / {formatAmount(daily, unit)}</span> : null}
          {pct != null ? <span className={`ml-2 font-black ${over ? 'text-amber-600' : 'text-[#004225]'}`}>{Math.round(pct)}%</span> : null}
        </span>
      </div>
      {pct != null && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${over ? 'bg-amber-500' : 'bg-[#004225]'}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}
    </li>
  );
}
