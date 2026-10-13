"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import MobileNav from '../components/MobileNav';
import Header from '../components/Header';
import PageSkeleton from '../components/PageSkeleton';
import {
  fetchShoppingSnapshot,
  formatShopQuantity,
  readShoppingCache,
  subscribeToShoppingChanges,
  type AggregatedIngredient,
} from '../lib/shopping';

interface ManualShoppingItem {
  id: string;
  item_name: string;
}

export default function ShoppingList() {
  const [list, setList] = useState<AggregatedIngredient[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [manualItems, setManualItems] = useState<ManualShoppingItem[]>([]);
  const [planCount, setPlanCount] = useState(0);
  const [newManualItem, setNewManualItem] = useState('');
  const [addingManualItem, setAddingManualItem] = useState(false);
  const [deletingManualItemIds, setDeletingManualItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const snapshot = await fetchShoppingSnapshot();
      setList(snapshot.list);
      setChecked(snapshot.checked);
      setManualItems(snapshot.manual);
      setPlanCount(snapshot.plans.length);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Show the last list instantly (works in the store with bad signal), then refresh.
    const cached = readShoppingCache();
    if (cached) {
      setList(cached.list);
      setChecked(cached.checked);
      setManualItems(cached.manual);
      setPlanCount(cached.plans.length);
      setLoading(false);
    }
    load();
    const unsubscribe = subscribeToShoppingChanges(load);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  async function setItemChecked(stateKey: string, next: boolean) {
    const key = stateKey.trim().toLowerCase();
    setChecked((prev) => ({ ...prev, [key]: next })); // optimistic

    const { error } = await supabase
      .from('shopping_list_state')
      .upsert({ item_name: key, is_checked: next, updated_at: new Date().toISOString() }, { onConflict: 'item_name' });

    if (error) setChecked((prev) => ({ ...prev, [key]: !next }));
  }

  async function uncheckAll() {
    const keys = list.map((item) => item.state_key).filter((key) => checked[key]);
    if (keys.length === 0) return;
    setChecked((prev) => Object.fromEntries(Object.entries(prev).map(([key, value]) => [key, keys.includes(key) ? false : value])));
    await supabase
      .from('shopping_list_state')
      .upsert(keys.map((item_name) => ({ item_name, is_checked: false, updated_at: new Date().toISOString() })), { onConflict: 'item_name' });
  }

  async function addManualItem() {
    const trimmed = newManualItem.trim();
    if (!trimmed || addingManualItem) return;

    setAddingManualItem(true);
    const { data, error } = await supabase
      .from('shopping_list_manual_items')
      .insert([{ item_name: trimmed }])
      .select('id, item_name')
      .single();

    if (error) {
      alert(error.message || 'Could not add item.');
    } else if (data) {
      setManualItems((prev) => [data, ...prev]);
      setNewManualItem('');
    }
    setAddingManualItem(false);
  }

  async function deleteManualItem(id: string) {
    if (deletingManualItemIds.includes(id)) return;
    setDeletingManualItemIds((prev) => [...prev, id]);

    const { error } = await supabase.from('shopping_list_manual_items').delete().eq('id', id);
    if (error) alert(error.message || 'Could not remove item.');
    else setManualItems((prev) => prev.filter((item) => item.id !== id));

    setDeletingManualItemIds((prev) => prev.filter((itemId) => itemId !== id));
  }

  const toBuy = useMemo(() => list.filter((item) => !checked[item.state_key]), [list, checked]);
  const inCart = useMemo(() => list.filter((item) => checked[item.state_key]), [list, checked]);

  if (loading) {
    return <PageSkeleton title="Shopping List" />;
  }

  const renderItem = (item: AggregatedIngredient, isChecked: boolean) => (
    <label
      key={item.state_key}
      className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100 active:bg-slate-100 transition-colors cursor-pointer"
    >
      <input
        type="checkbox"
        checked={isChecked}
        onChange={() => setItemChecked(item.state_key, !isChecked)}
        className="w-7 h-7 rounded-full border-2 border-slate-300 appearance-none checked:bg-[#004225] checked:border-[#004225] transition-all shrink-0"
      />
      <div className="min-w-0">
        <span className={`font-bold text-lg block leading-tight ${isChecked ? 'text-slate-300 line-through' : 'text-slate-900'}`}>
          {item.canonical_name}
          {formatShopQuantity(item.prep_details) ? (
            <span className={`ml-2 text-base font-black ${isChecked ? 'text-slate-300' : 'text-[#004225]'}`}>{formatShopQuantity(item.prep_details)}</span>
          ) : null}
        </span>
        <div className={`text-[11px] font-bold tracking-tight truncate ${isChecked ? 'text-slate-300' : 'text-slate-500'}`}>
          {item.recipeTitles.join(' · ')}
        </div>
      </div>
    </label>
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-white to-slate-100 pb-44 px-4 sm:px-6 pt-8 sm:pt-10">
      <Header />

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="page-title-brand text-3xl sm:text-4xl">Shopping List</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
            {toBuy.length + manualItems.length} to get{inCart.length ? ` · ${inCart.length} in cart` : ''}
            {refreshing ? ' · syncing…' : ''}
            {offline ? ' · offline, showing last list' : ''}
          </p>
        </div>
      </div>

      {/* Quick add stays at the top: it's the thing you do mid-cook. */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newManualItem}
          onChange={(e) => setNewManualItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addManualItem();
            }
          }}
          placeholder="Add anything (paper towels, milk…)"
          enterKeyHint="done"
          className="flex-1 min-w-0 bg-white border border-slate-300 rounded-xl px-4 py-3 text-base font-medium text-slate-900"
        />
        <button
          onClick={addManualItem}
          disabled={addingManualItem || !newManualItem.trim()}
          className="px-5 py-3 rounded-xl bg-[#004225] text-white text-sm font-bold disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {toBuy.length === 0 && manualItems.length === 0 && inCart.length === 0 ? (
        <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-bold italic">{planCount === 0 ? 'No meals planned yet.' : 'Nothing on the list.'}</p>
          <Link href="/meal-plan" className="inline-block mt-4 text-[#004225] font-black uppercase text-xs tracking-widest">
            Go to Plan →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {manualItems.length > 0 && (
            <section>
              <h2 className="text-[11px] font-black text-amber-700 uppercase tracking-[0.2em] mb-2">Extras</h2>
              <div className="space-y-2">
                {manualItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 ${deletingManualItemIds.includes(item.id) ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <span className="font-semibold text-slate-900 capitalize">{item.item_name}</span>
                    <button
                      onClick={() => deleteManualItem(item.id)}
                      className="text-xs font-black uppercase tracking-wider text-red-600 px-2 py-2"
                      aria-label={`Remove ${item.item_name}`}
                    >
                      Got it
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {toBuy.length > 0 && <div className="space-y-2">{toBuy.map((item) => renderItem(item, false))}</div>}

          {inCart.length > 0 && (
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 [&::-webkit-details-marker]:hidden">
                <span>In cart ({inCart.length})</span>
                <span aria-hidden="true" className="text-base transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="space-y-2 mt-2">{inCart.map((item) => renderItem(item, true))}</div>
              <button onClick={uncheckAll} className="mt-4 text-xs font-black uppercase tracking-widest text-slate-500 px-1 py-2">
                Uncheck all
              </button>
            </details>
          )}
        </div>
      )}

      <MobileNav />
    </main>
  );
}
