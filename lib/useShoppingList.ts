import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { fetchShoppingSnapshot, readShoppingCache, subscribeToShoppingChanges, type AggregatedIngredient } from './shopping';

export interface ManualShoppingItem {
  id: string;
  item_name: string;
}

/**
 * The household shopping list: the last copy from this phone first (so it opens instantly, even in a store with no
 * signal), then a fresh copy, kept live when anyone changes it. Used by the list screen and the Today screen.
 */
export function useShoppingList() {
  const [list, setList] = useState<AggregatedIngredient[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [manualItems, setManualItems] = useState<ManualShoppingItem[]>([]);
  const [planCount, setPlanCount] = useState(0);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
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
    // Show the last list instantly, then refresh.
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

  /** Returns true when the item was added. */
  async function addManualItem(name: string): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const { data, error } = await supabase.from('shopping_list_manual_items').insert([{ item_name: trimmed }]).select('id, item_name').single();
    if (error) {
      alert(error.message || 'Could not add item.');
      return false;
    }
    if (data) setManualItems((prev) => [data, ...prev]);
    return true;
  }

  async function deleteManualItem(id: string) {
    if (deletingIds.includes(id)) return;
    setDeletingIds((prev) => [...prev, id]);
    const { error } = await supabase.from('shopping_list_manual_items').delete().eq('id', id);
    if (error) alert(error.message || 'Could not remove item.');
    else setManualItems((prev) => prev.filter((item) => item.id !== id));
    setDeletingIds((prev) => prev.filter((itemId) => itemId !== id));
  }

  const toBuy = useMemo(() => list.filter((item) => !checked[item.state_key]), [list, checked]);
  const inCart = useMemo(() => list.filter((item) => checked[item.state_key]), [list, checked]);

  return {
    toBuy,
    inCart,
    manualItems,
    planCount,
    deletingIds,
    loading,
    refreshing,
    offline,
    toGetCount: toBuy.length + manualItems.length,
    setItemChecked,
    uncheckAll,
    addManualItem,
    deleteManualItem,
  };
}

export type ShoppingListState = ReturnType<typeof useShoppingList>;
