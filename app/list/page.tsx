"use client";
import Link from 'next/link';
import { useShoppingList } from '../../lib/useShoppingList';
import { ExtraRow, IngredientRow, QuickAdd } from '../../components/shopping/ListParts';

/** The shopping list on its own, no bottom bar: the in-store view. Back goes to Today. */
export default function ListScreen() {
  const shopping = useShoppingList();
  const { toBuy, inCart, manualItems } = shopping;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-white to-slate-100 px-4 pt-6 sm:px-6" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to Today"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 active:bg-slate-100"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div>
            <h1 className="page-title-brand text-3xl sm:text-4xl">Shopping List</h1>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">
              {shopping.toGetCount} to get{inCart.length ? ` · ${inCart.length} in cart` : ''}
              {shopping.refreshing ? ' · syncing…' : ''}
              {shopping.offline ? ' · offline, showing last list' : ''}
            </p>
          </div>
        </div>

        {/* Quick add stays at the top: it's the thing you do mid-cook. */}
        <div className="mb-6">
          <QuickAdd onAdd={shopping.addManualItem} />
        </div>

        {shopping.loading ? (
          <p className="py-16 text-center text-sm font-bold text-slate-400">Loading your list…</p>
        ) : toBuy.length === 0 && manualItems.length === 0 && inCart.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 py-20 text-center">
            <p className="font-bold italic text-slate-400">{shopping.planCount === 0 ? 'No meals planned yet.' : 'Nothing on the list.'}</p>
            <Link href="/meal-plan" className="mt-4 inline-block text-xs font-black uppercase tracking-widest text-[#004225]">
              Go to Plan →
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {manualItems.length > 0 && (
              <section>
                <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">Extras</h2>
                <div className="space-y-2">
                  {manualItems.map((item) => (
                    <ExtraRow key={item.id} item={item} busy={shopping.deletingIds.includes(item.id)} onRemove={shopping.deleteManualItem} />
                  ))}
                </div>
              </section>
            )}

            {toBuy.length > 0 && (
              <div className="space-y-2">
                {toBuy.map((item) => (
                  <IngredientRow key={item.state_key} item={item} checked={false} onToggle={shopping.setItemChecked} />
                ))}
              </div>
            )}

            {inCart.length > 0 && (
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 [&::-webkit-details-marker]:hidden">
                  <span>In cart ({inCart.length})</span>
                  <span aria-hidden="true" className="text-base transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="mt-2 space-y-2">
                  {inCart.map((item) => (
                    <IngredientRow key={item.state_key} item={item} checked onToggle={shopping.setItemChecked} />
                  ))}
                </div>
                <button onClick={shopping.uncheckAll} className="mt-4 px-1 py-2 text-xs font-black uppercase tracking-widest text-slate-500">
                  Uncheck all
                </button>
              </details>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
