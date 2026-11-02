type Props = {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  kcal: number;
  /** Still a draft from the backfill: shown with a dot so it reads as approximate. */
  estimated?: boolean;
  className?: string;
};

/** Macros in grams, a thin bar showing how the calories split, and calories as the quiet number. */
export default function MacroLine({ protein_g, carbs_g, fat_g, kcal, estimated = false, className = '' }: Props) {
  // Share of calories: 4 per gram of protein and carbs, 9 per gram of fat.
  const p = protein_g * 4;
  const c = carbs_g * 4;
  const f = fat_g * 9;
  const total = p + c + f || 1;

  return (
    <div className={className}>
      <p className="text-xs font-black text-slate-700">
        {Math.round(protein_g)} <span className="text-[#004225]">P</span> · {Math.round(carbs_g)} <span className="text-amber-600">C</span> · {Math.round(fat_g)}{' '}
        <span className="text-sky-600">F</span>
        <span className="ml-2 font-bold text-slate-400">
          {estimated ? '~' : ''}
          {Math.round(kcal)} kcal
        </span>
      </p>
      <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Share of calories from protein, carbs and fat">
        <span className="bg-[#004225]" style={{ width: `${(p / total) * 100}%` }} />
        <span className="bg-amber-500" style={{ width: `${(c / total) * 100}%` }} />
        <span className="bg-sky-500" style={{ width: `${(f / total) * 100}%` }} />
      </div>
    </div>
  );
}
