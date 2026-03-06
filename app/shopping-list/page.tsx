"use client";
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { startOfWeek, format } from 'date-fns';
import MobileNav from '../../components/MobileNav';

export default function ShoppingList() {
  const [mealPlans, setMealPlans] = useState<any[]>([]);
  const [aggregatedIngredients, setAggregatedIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  async function fetchMealPlans() {
    const { data } = await supabase.from('meal_plans').select(`*, recipe:recipes (id, title, ingredients (*))`).order('day_of_week');
    if (data) setMealPlans(data);
    setLoading(false);
  }

  const aggregateIngredients = useCallback(() => {
    const ingredientMap = new Map();
    mealPlans.forEach((meal) => {
      meal.recipe?.ingredients?.forEach((ing: any) => {
        const key = `${ing.item_name.toLowerCase()}-${ing.unit}`;
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key);
          existing.total_amount += ing.amount;
          if (!existing.recipeTitles.includes(meal.recipe.title)) existing.recipeTitles.push(meal.recipe.title);
        } else {
          ingredientMap.set(key, { ...ing, total_amount: ing.amount, recipeTitles: [meal.recipe.title] });
        }
      });
    });
    setAggregatedIngredients(Array.from(ingredientMap.values()).sort((a, b) => a.item_name.localeCompare(b.item_name)));
  }, [mealPlans]);

  useEffect(() => { fetchMealPlans(); }, []);
  useEffect(() => { aggregateIngredients(); }, [mealPlans, aggregateIngredients]);

  if (loading) return <div className="p-20 text-center text-slate-900 font-bold">Generating List...</div>;

  return (
    <main className="min-h-screen bg-white pb-40 px-6 pt-10">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 leading-tight tracking-tighter">Shopping List</h1>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Week of {format(weekStart, 'MMM d')}</p>
      </header>

      {mealPlans.length > 0 ? (
        <div className="space-y-8">
          <div className="space-y-2">
            {aggregatedIngredients.map((item, i) => (
              <label key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 active:bg-slate-100 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <input type="checkbox" className="w-6 h-6 rounded-full border-2 border-slate-300 appearance-none checked:bg-[#004225] checked:border-[#004225] transition-all shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 text-lg block group-has-[:checked]:text-slate-300 group-has-[:checked]:line-through capitalize">{item.item_name}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight group-has-[:checked]:text-slate-200">{item.recipeTitles.join(' • ')}</span>
                  </div>
                </div>
                <span className="text-slate-900 font-black text-sm group-has-[:checked]:text-slate-200">{item.total_amount}{item.unit}</span>
              </label>
            ))}
          </div>

          <section className="mt-12 pt-8 border-t border-slate-100">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Planned Recipes</h2>
            <div className="grid grid-cols-1 gap-3">
              {mealPlans.map((meal) => (
                <Link key={meal.id} href={`/recipes/${meal.recipe?.id}`} className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl active:bg-slate-50 transition-all shadow-sm">
                  <span className="font-bold text-slate-900">{meal.recipe?.title}</span>
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="py-20 text-center text-slate-400 font-bold italic">No meals planned yet.</div>
      )}
      <MobileNav />
    </main>
  );
}