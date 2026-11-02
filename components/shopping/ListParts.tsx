"use client";
import { useState } from 'react';
import { formatShopQuantity, type AggregatedIngredient } from '../../lib/shopping';
import type { ManualShoppingItem } from '../../lib/useShoppingList';

/** One ingredient on the list: tap the circle to put it in the cart. */
export function IngredientRow({ item, checked, onToggle }: { item: AggregatedIngredient; checked: boolean; onToggle: (stateKey: string, next: boolean) => void }) {
  const quantity = formatShopQuantity(item.prep_details);
  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-4 transition-colors active:bg-slate-100">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(item.state_key, !checked)}
        className="h-7 w-7 shrink-0 appearance-none rounded-full border-2 border-slate-300 transition-all checked:border-[#004225] checked:bg-[#004225]"
      />
      <div className="min-w-0">
        <span className={`block text-lg font-bold leading-tight ${checked ? 'text-slate-300 line-through' : 'text-slate-900'}`}>
          {item.canonical_name}
          {quantity ? <span className={`ml-2 text-base font-black ${checked ? 'text-slate-300' : 'text-[#004225]'}`}>{quantity}</span> : null}
        </span>
        <div className={`truncate text-[11px] font-bold tracking-tight ${checked ? 'text-slate-300' : 'text-slate-500'}`}>{item.recipeTitles.join(' · ')}</div>
      </div>
    </label>
  );
}

/** One of the things added by hand ("paper towels"). */
export function ExtraRow({ item, busy, onRemove }: { item: ManualShoppingItem; busy: boolean; onRemove: (id: string) => void }) {
  return (
    <div className={`flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
      <span className="font-semibold capitalize text-slate-900">{item.item_name}</span>
      <button onClick={() => onRemove(item.id)} className="px-2 py-2 text-xs font-black uppercase tracking-wider text-red-600" aria-label={`Remove ${item.item_name}`}>
        Got it
      </button>
    </div>
  );
}

/** "Add anything (paper towels, milk…)" with its Add button. */
export function QuickAdd({ onAdd }: { onAdd: (name: string) => Promise<boolean> }) {
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);

  async function submit() {
    if (!text.trim() || adding) return;
    setAdding(true);
    if (await onAdd(text)) setText('');
    setAdding(false);
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Add anything (paper towels, milk…)"
        enterKeyHint="done"
        aria-label="Add an item to the shopping list"
        className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900"
      />
      <button onClick={submit} disabled={adding || !text.trim()} className="rounded-xl bg-[#004225] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">
        Add
      </button>
    </div>
  );
}
