"use client";
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { startOfWeek, format } from 'date-fns';
import MobileNav from '../../components/MobileNav';
import {
  buildShoppingStateKey,
  inferCanonicalIngredient,
  inferPreparationNote,
} from '../../lib/ingredient-normalization';

interface ManualShoppingItem {
  id: string;
  item_name: string;
  created_at?: string;
}

interface IngredientAlias {
  raw_term: string;
  canonical_name: string;
}

interface IngredientPrepDetail {
  label: string;
  amount: number;
  recipeTitles: string[];
}

interface AggregatedIngredient {
  state_key: string;
  canonical_name: string;
  unit: string;
  total_amount: number;
  recipeTitles: string[];
  prep_details: IngredientPrepDetail[];
}

export default function ShoppingList() {
  const [mealPlans, setMealPlans] = useState<any[]>([]);
  const [aggregatedIngredients, setAggregatedIngredients] = useState<AggregatedIngredient[]>([]);
  const [shoppingState, setShoppingState] = useState<Record<string, boolean>>({});
  const [aliases, setAliases] = useState<IngredientAlias[]>([]);
  const [manualItems, setManualItems] = useState<ManualShoppingItem[]>([]);
  const [newManualItem, setNewManualItem] = useState('');
  const [addingManualItem, setAddingManualItem] = useState(false);
  const [loading, setLoading] = useState(true);

  // Set the week start for reference labels
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  async function fetchMealPlans() {
    const { data } = await supabase
      .from('meal_plans')
      .select(`*, recipe:recipes (id, title, ingredients (*))`)
      .order('day_of_week');
    
    if (data) setMealPlans(data);
  }

  async function fetchShoppingState() {
    const { data } = await supabase
      .from('shopping_list_state')
      .select('item_name, is_checked');

    if (!data) return;

    const stateMap: Record<string, boolean> = {};
    data.forEach((row: { item_name: string; is_checked: boolean }) => {
      stateMap[row.item_name.trim().toLowerCase()] = row.is_checked;
    });
    setShoppingState(stateMap);
  }

  async function fetchManualItems() {
    const { data } = await supabase
      .from('shopping_list_manual_items')
      .select('id, item_name, created_at')
      .order('created_at', { ascending: false });

    if (data) {
      setManualItems(data);
    }
  }

  async function fetchAliases() {
    const { data } = await supabase
      .from('ingredient_aliases')
      .select('raw_term, canonical_name');

    if (data) {
      // More specific aliases first to avoid broad-term collisions.
      const sorted = [...data].sort((a, b) => b.raw_term.length - a.raw_term.length);
      setAliases(sorted);
    }
  }

  const aggregateIngredients = useCallback(() => {
    const ingredientMap = new Map<string, AggregatedIngredient>();

    mealPlans.forEach((meal) => {
      meal.recipe?.ingredients?.forEach((ing: any) => {
        const inferredCanonical = (ing.canonical_name?.trim() || inferCanonicalIngredient(ing.item_name || '')).trim();
        const sourceText = `${ing.item_name || ''} ${inferredCanonical}`.toLowerCase();
        const aliasMatch = aliases.find((alias) => sourceText.includes(alias.raw_term.toLowerCase()));
        const canonicalName = (aliasMatch?.canonical_name || inferredCanonical).trim();
        const unit = (ing.unit || 'item').trim();
        const stateKey = buildShoppingStateKey(canonicalName, unit);
        const amount = Number(ing.amount || 0);
        const recipeTitle = meal.recipe?.title || 'Recipe';
        const prepLabel = (ing.preparation_note?.trim() || inferPreparationNote(ing.item_name || '', canonicalName) || 'General').trim();
        
        if (ingredientMap.has(stateKey)) {
          const existing = ingredientMap.get(stateKey)!;
          existing.total_amount += amount;
          if (!existing.recipeTitles.includes(recipeTitle)) {
            existing.recipeTitles.push(recipeTitle);
          }

          const existingPrep = existing.prep_details.find((prep) => prep.label === prepLabel);
          if (existingPrep) {
            existingPrep.amount += amount;
            if (!existingPrep.recipeTitles.includes(recipeTitle)) {
              existingPrep.recipeTitles.push(recipeTitle);
            }
          } else {
            existing.prep_details.push({
              label: prepLabel,
              amount,
              recipeTitles: [recipeTitle],
            });
          }
        } else {
          ingredientMap.set(stateKey, {
            state_key: stateKey,
            canonical_name: canonicalName,
            unit,
            total_amount: amount,
            recipeTitles: [recipeTitle],
            prep_details: [
              {
                label: prepLabel,
                amount,
                recipeTitles: [recipeTitle],
              },
            ],
          });
        }
      });
    });

    const aggregated = Array.from(ingredientMap.values()).sort((a, b) =>
      a.canonical_name.localeCompare(b.canonical_name)
    );

    aggregated.forEach((item) => {
      item.prep_details.sort((a, b) => a.label.localeCompare(b.label));
    });

    setAggregatedIngredients(aggregated);
  }, [mealPlans, aliases]);

  async function loadShoppingPageData() {
    await Promise.all([fetchMealPlans(), fetchShoppingState(), fetchManualItems(), fetchAliases()]);
    setLoading(false);
  }

  async function toggleItem(stateKey: string, currentState: boolean) {
    const normalized = stateKey.trim().toLowerCase();
    const { error } = await supabase
      .from('shopping_list_state')
      .upsert(
        {
          item_name: normalized,
          is_checked: !currentState,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'item_name' }
      );

    if (!error) {
      setShoppingState((prev) => ({
        ...prev,
        [normalized]: !currentState,
      }));
    }
  }

  async function addManualItem() {
    const trimmed = newManualItem.trim();
    if (!trimmed || addingManualItem) return;

    setAddingManualItem(true);
    const { data, error } = await supabase
      .from('shopping_list_manual_items')
      .insert([{ item_name: trimmed }])
      .select('id, item_name, created_at')
      .single();

    if (error) {
      alert(error.message || 'Could not add item.');
      setAddingManualItem(false);
      return;
    }

    if (data) {
      setManualItems((prev) => [data, ...prev]);
      setNewManualItem('');
    }
    setAddingManualItem(false);
  }

  async function deleteManualItem(id: string) {
    const { error } = await supabase
      .from('shopping_list_manual_items')
      .delete()
      .eq('id', id);

    if (!error) {
      setManualItems((prev) => prev.filter((item) => item.id !== id));
    }
  }

  useEffect(() => { loadShoppingPageData(); }, []);
  useEffect(() => { aggregateIngredients(); }, [mealPlans, aggregateIngredients]);

  useEffect(() => {
    const aliasChannel = supabase
      .channel('ingredient-aliases-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredient_aliases' }, () => {
        fetchAliases();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(aliasChannel);
    };
  }, []);

  const orderedIngredients = [...aggregatedIngredients].sort((a, b) => {
    const aChecked = shoppingState[a.state_key.trim().toLowerCase()] || false;
    const bChecked = shoppingState[b.state_key.trim().toLowerCase()] || false;

    if (aChecked !== bChecked) {
      return aChecked ? 1 : -1;
    }

    return a.canonical_name.localeCompare(b.canonical_name);
  });

  if (loading) return (
    <div className="p-20 text-center text-slate-900 font-black animate-pulse">
      GENERATING LIST...
    </div>
  );

  return (
    <main className="min-h-screen bg-white pb-40 px-6 pt-10">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 leading-tight tracking-tighter">
          Shopping List
        </h1>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
          Week of {format(weekStart, 'MMM d')}
        </p>
      </header>

      {/* Manual Items: separate from recipe ingredients and removable */}
      <section className="mb-8 bg-amber-50 border border-amber-200 rounded-3xl p-4">
        <h2 className="text-xs font-black text-amber-700 uppercase tracking-[0.2em] mb-3">
          Extras To Buy
        </h2>
        <div className="flex gap-2 mb-3">
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
            placeholder="Add non-recipe item (e.g. paper towels)"
            className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-900"
          />
          <button
            onClick={addManualItem}
            disabled={addingManualItem || !newManualItem.trim()}
            className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-bold disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {manualItems.length > 0 ? (
          <div className="space-y-2">
            {manualItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-white border border-amber-200 rounded-2xl px-4 py-3">
                <span className="font-semibold text-slate-900 capitalize">{item.item_name}</span>
                <button
                  onClick={() => deleteManualItem(item.id)}
                  className="text-xs font-black uppercase tracking-wider text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs font-medium text-amber-700">No extra items yet.</p>
        )}
      </section>

      {aggregatedIngredients.length > 0 ? (
        <div className="space-y-8">
          {/* 1. High-Contrast Ingredients Checklist */}
          <div className="space-y-2">
            {orderedIngredients.map((item, i) => (
              (() => {
                const isChecked = shoppingState[item.state_key.trim().toLowerCase()] || false;
                return (
              <label 
                key={`${item.state_key}-${i}`} 
                className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 active:bg-slate-100 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  {/* British Racing Green Checkbox */}
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={() => toggleItem(item.state_key, isChecked)}
                    className="w-6 h-6 rounded-full border-2 border-slate-300 appearance-none checked:bg-[#004225] checked:border-[#004225] transition-all shrink-0" 
                  />
                  <div>
                    <span className={`font-bold text-lg block capitalize leading-tight ${isChecked ? 'text-slate-300 line-through' : 'text-slate-900'}`}>
                      {item.canonical_name}
                    </span>
                    <div className={`text-[10px] font-black uppercase tracking-tight space-y-1 ${isChecked ? 'text-slate-200' : 'text-slate-500'}`}>
                      {item.prep_details.map((prep) => (
                        <div key={`${item.state_key}-${prep.label}`}>
                          {prep.label === 'General'
                            ? `${prep.amount} ${item.unit} • ${prep.recipeTitles.join(' • ')}`
                            : `${prep.amount} ${item.unit} (${prep.label}) • ${prep.recipeTitles.join(' • ')}`}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <span className={`font-black text-sm shrink-0 ${isChecked ? 'text-slate-200' : 'text-slate-900'}`}>
                  {item.total_amount} {item.unit}
                </span>
              </label>
                );
              })()
            ))}
          </div>

          {/* 2. Restored Planned Recipes Reference Card */}
          <section className="mt-12 pt-8 border-t border-slate-100">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
              Planned Recipes
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {mealPlans.map((meal) => (
                <Link 
                  key={meal.id} 
                  href={`/recipes/${meal.recipe?.id}`} 
                  className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl active:bg-slate-50 transition-all shadow-sm group"
                >
                  <span className="font-bold text-slate-900 group-hover:text-[#004225]">
                    {meal.recipe?.title}
                  </span>
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-[#004225] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-bold italic">
            {manualItems.length > 0 ? 'No recipe ingredients right now.' : 'No meals planned yet.'}
          </p>
          <Link href="/meal-plan" className="inline-block mt-4 text-[#004225] font-black uppercase text-xs tracking-widest">
            Go to Plan →
          </Link>
        </div>
      )}

      {/* Floating Navigation */}
      <MobileNav />
    </main>
  );
}