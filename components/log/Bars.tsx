/** Small progress bar and macro readout used on the Log page and the Today calories card. */

export function Bar({ value, goal, className = '' }: { value: number; goal: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, (value / goal) * 100));
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div className={`h-full rounded-full ${value > goal ? 'bg-amber-500' : 'bg-[#004225]'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Macro({ label, value, goal }: { label: string; value: number; goal: number | null }) {
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
