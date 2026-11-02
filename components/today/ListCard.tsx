"use client";
import Link from 'next/link';
import type { ShoppingListState } from '../../lib/useShoppingList';
import { ExtraRow, IngredientRow, QuickAdd } from '../shopping/ListParts';

const PREVIEW_ROWS = 6;

/** The shopping list on Today: add and check things off in place, or open the list on its own for the store. */
export default function ListCard({ shopping }: { shopping: ShoppingListState }) {
  const { toBuy, manualItems, toGetCount } = shopping;
  const extras = manualItems.slice(0, PREVIEW_ROWS);
  const ingredients = toBuy.slice(0, Math.max(0, PREVIEW_ROWS - extras.length));
  const shown = extras.length + ingredients.length;
  const hidden = toGetCount - shown;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <Link href="/list" className="mb-3 flex items-center justify-between gap-3" aria-label="Open the shopping list">
        <div>
          <h2 className="page-title-brand text-xl">Shopping List</h2>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {toGetCount} to get{shopping.offline ? ' · offline' : ''}
          </p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500" aria-hidden="true">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 6l6 6-6 6" />
          </svg>
        </span>
      </Link>

      <QuickAdd onAdd={shopping.addManualItem} />

      {toGetCount === 0 ? (
        <p className="mt-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm font-bold italic text-slate-400">
          {shopping.planCount === 0 ? 'Nothing on the list. Plan some meals or add an item.' : 'Nothing left to get.'}
        </p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {extras.map((item) => (
            <ExtraRow key={item.id} item={item} busy={shopping.deletingIds.includes(item.id)} onRemove={shopping.deleteManualItem} compact />
          ))}
          {ingredients.map((item) => (
            <IngredientRow key={item.state_key} item={item} checked={false} onToggle={shopping.setItemChecked} compact />
          ))}
          {hidden > 0 && (
            <Link href="/list" className="block rounded-2xl py-3 text-center text-xs font-black uppercase tracking-widest text-[#004225] active:bg-slate-50">
              {hidden} more · open the list →
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
