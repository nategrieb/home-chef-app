"use client";
import { useRef, useState } from 'react';
import { MAX_ENTRY_GRAMS } from '../../lib/portions';
import { parseNumber, type LogEntry } from '../../lib/nutrition';

export type EntryAmount = { grams: number; quantity: number | null; portion_label: string | null };

/** Change how much of a logged food you had, or delete the entry. Used on Today and on the Log page. */
export default function EditEntrySheet({
  entry,
  onClose,
  onSave,
  onDelete,
}: {
  entry: LogEntry;
  onClose: () => void;
  onSave: (entry: LogEntry, amount: EntryAmount) => void;
  onDelete: (entry: LogEntry) => void;
}) {
  // Entries logged as "2 × large egg" are edited in eggs; "Use grams" switches to weight.
  const counted = Boolean(entry.portion_label && entry.quantity);
  const [byGrams, setByGrams] = useState(!counted);
  const [text, setText] = useState(String(byGrams ? entry.grams : entry.quantity));
  const inputRef = useRef<HTMLInputElement>(null);
  const value = parseNumber(text);
  const gramsPerUnit = counted ? entry.grams / (entry.quantity as number) : 1;
  const newGrams = value ? Math.round(value * (byGrams ? 1 : gramsPerUnit) * 10) / 10 : null;

  const tooMuch = newGrams != null && newGrams > MAX_ENTRY_GRAMS;

  function switchMode(toGrams: boolean) {
    setByGrams(toGrams);
    setText(String(toGrams ? entry.grams : entry.quantity));
    // Put the cursor back in the box with the number selected, so the next thing typed replaces it.
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }

  function save() {
    if (!value || !newGrams || newGrams <= 0 || tooMuch) return;
    onSave(entry, byGrams ? { grams: newGrams, quantity: null, portion_label: null } : { grams: newGrams, quantity: value, portion_label: entry.portion_label });
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="truncate text-lg font-black text-slate-900">{entry.name}</h2>
        <label className="mt-4 block text-[10px] font-black uppercase tracking-widest text-slate-400">
          {byGrams ? 'Amount in grams' : `How many ${entry.portion_label}`}
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            ref={inputRef}
            autoFocus
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-2xl font-bold text-slate-900 outline-none focus:border-[#004225]"
          />
          <span className="shrink-0 text-lg font-black text-slate-400">{byGrams ? 'g' : '×'}</span>
        </div>
        <p className="mt-2 text-sm font-bold text-slate-400">
          {tooMuch ? `${newGrams} g is over ${MAX_ENTRY_GRAMS / 1000} kg. Check the number.` : newGrams ? `= ${newGrams} g` : ' '}
          {counted && (
            <button onClick={() => switchMode(!byGrams)} className="ml-3 underline">
              {byGrams ? `Use ${entry.portion_label}` : 'Use grams'}
            </button>
          )}
        </p>
        <div className="mt-5 flex gap-3">
          <button onClick={() => onDelete(entry)} className="rounded-2xl bg-red-50 px-5 py-4 text-xs font-black uppercase tracking-widest text-red-600 active:scale-95">
            Delete
          </button>
          <button
            onClick={save}
            disabled={!newGrams || newGrams <= 0 || tooMuch}
            className="flex-1 rounded-2xl bg-[#004225] py-4 text-xs font-black uppercase tracking-widest text-white disabled:opacity-40 active:scale-95"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
