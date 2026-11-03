"use client";
import { useState } from 'react';
import { useFoodSearch } from '../../lib/useFoodSearch';
import type { Food } from '../../lib/nutrition';

type Props = {
  title?: string;
  onPick: (food: Food) => void;
  onClose: () => void;
};

/** A small search sheet that returns one food (no amount screen). Used to swap or add foods in a recipe. */
export default function FoodPicker({ title = 'Choose a food', onPick, onClose }: Props) {
  const [query, setQuery] = useState('');
  const { results, searching } = useFoodSearch(query);

  const show = query.trim().length >= 2;

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center bg-slate-950/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mt-3 flex w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl"
        style={{ height: 'min(80dvh, 640px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between px-6 pb-3 pt-5">
          <h2 className="text-xl font-black text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="h-10 w-10 rounded-full text-2xl font-black text-slate-400 active:bg-slate-100">
            ×
          </button>
        </div>
        <div className="shrink-0 px-6">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search foods, e.g. rolled oats"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold text-slate-900 outline-none focus:border-[#004225]"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-3">
          {show ? (
            <ul className="space-y-2">
              {results.map((food) => (
                <li key={food.id}>
                  <button onClick={() => onPick(food)} className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-left active:bg-slate-100">
                    <p className="truncate text-sm font-bold text-slate-900">{food.brand ? `${food.name} · ${food.brand}` : food.name}</p>
                    <p className="text-xs font-bold text-slate-400">
                      {Math.round(food.kcal_100g)} kcal · {food.protein_100g} P · {food.carbs_100g} C · {food.fat_100g} F per 100 g
                    </p>
                  </button>
                </li>
              ))}
              {searching && results.length === 0 && <li className="py-4 text-center text-sm font-bold text-slate-400">Searching…</li>}
              {!searching && results.length === 0 && <li className="py-4 text-center text-sm font-bold text-slate-400">No matches yet.</li>}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm font-bold text-slate-400">Type at least two letters.</p>
          )}
        </div>
      </div>
    </div>
  );
}
