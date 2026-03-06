"use client";
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { startOfWeek, format } from 'date-fns';
import MobileNav from '../../components/MobileNav';

export default function ShoppingList() {
  const [mealPlans, setMealPlans] = useState<any[]>([]);
  const [aggregatedIngredients, setAggregatedIngredients] = useState<any[]>([]);
  const [shoppingState, setShoppingState] = useState<Record<string, boolean>>({});
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

  const aggregateIngredients = useCallback(() => {
    const ingredientMap = new Map();

    mealPlans.forEach((meal) => {
      meal.recipe?.ingredients?.forEach((ing: any) => {
        const key = `${ing.item_name.toLowerCase()}-${ing.unit}`;
        
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key);
          existing.total_amount += ing.amount;
          // Avoid duplicate recipe titles for the same ingredient
          if (!existing.recipeTitles.includes(meal.recipe.title)) {
            existing.recipeTitles.push(meal.recipe.title);
          }
        } else {
          ingredientMap.set(key, { 
            ...ing, 
            total_amount: ing.amount, 
            recipeTitles: [meal.recipe.title] 
          });
        }
      });
    });

    // Sort alphabetically for easier shopping
    setAggregatedIngredients(
      Array.from(ingredientMap.values()).sort((a, b) => 
        a.item_name.localeCompare(b.item_name)
      )
    );
  }, [mealPlans]);

  async function loadShoppingPageData() {
    await Promise.all([fetchMealPlans(), fetchShoppingState()]);
    setLoading(false);
  }

  async function toggleItem(itemName: string, currentState: boolean) {
    const normalized = itemName.trim().toLowerCase();
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

  useEffect(() => { loadShoppingPageData(); }, []);
  useEffect(() => { aggregateIngredients(); }, [mealPlans, aggregateIngredients]);

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

      {mealPlans.length > 0 ? (
        <div className="space-y-8">
          {/* 1. High-Contrast Ingredients Checklist */}
          <div className="space-y-2">
            {aggregatedIngredients.map((item, i) => (
              <label 
                key={i} 
                className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 active:bg-slate-100 transition-all cursor-pointer group"
              >
                {(() => {
                  const isChecked = shoppingState[item.item_name.trim().toLowerCase()] || false;
                  return (
                    <>
                <div className="flex items-center gap-4">
                  {/* British Racing Green Checkbox */}
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={() => toggleItem(item.item_name, isChecked)}
                    className="w-6 h-6 rounded-full border-2 border-slate-300 appearance-none checked:bg-[#004225] checked:border-[#004225] transition-all shrink-0" 
                  />
                  <div>
                    <span className={`font-bold text-lg block capitalize leading-tight ${isChecked ? 'text-slate-300 line-through' : 'text-slate-900'}`}>
                      {item.item_name}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-tight ${isChecked ? 'text-slate-200' : 'text-slate-400'}`}>
                      {item.recipeTitles.join(' • ')}
                    </span>
                  </div>
                </div>
                <span className={`font-black text-sm shrink-0 ${isChecked ? 'text-slate-200' : 'text-slate-900'}`}>
                  {item.total_amount} {item.unit}
                </span>
                    </>
                  );
                })()}
              </label>
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
          <p className="text-slate-400 font-bold italic">No meals planned yet.</p>
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