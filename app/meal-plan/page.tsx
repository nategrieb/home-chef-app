"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { format, startOfWeek } from 'date-fns';

export default function MealPlan() {
  const [mealPlans, setMealPlans] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedRecipe, setSelectedRecipe] = useState<string>('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return date;
  });

  async function fetchData() {
    const { data: plans } = await supabase.from('meal_plans').select('*, recipe:recipes(*)').order('day_of_week');
    const { data: recs } = await supabase.from('recipes').select('*').order('title');
    setMealPlans(plans || []);
    setRecipes(recs || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function addMealToPlan(recipeId: string, dayIndex: number) {
    const { error } = await supabase.from('meal_plans').insert([{ recipe_id: recipeId, day_of_week: dayIndex }]);
    if (!error) {
      fetchData();
      setSelectedDate('');
      setSelectedRecipe('');
    }
  }

  async function removeMealFromPlan(mealPlanId: string) {
    setRemovingId(mealPlanId); // Trigger exit animation
    setTimeout(async () => {
      await supabase.from('meal_plans').delete().eq('id', mealPlanId);
      setMealPlans(prev => prev.filter(p => p.id !== mealPlanId));
      setRemovingId(null);
    }, 300); // Match animation duration
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-900">Weekly Plan</h1>
          <Link href="/shopping-list" className="bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
            View List
          </Link>
        </header>

        <div className="space-y-6">
          {weekDays.map((day, index) => (
            <section key={index} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-bold text-slate-800">{format(day, 'EEEE')}</h2>
                <span className="text-xs text-slate-400 uppercase tracking-widest">{format(day, 'MMM d')}</span>
              </div>

              <div className="p-4 space-y-3">
                {mealPlans.filter(p => p.day_of_week === index).map((meal) => (
                  <div
                    key={meal.id}
                    className={`flex items-center gap-3 transition-all duration-300 transform ${
                      removingId === meal.id ? "opacity-0 -translate-x-full scale-95" : "opacity-100 translate-x-0 scale-100 animate-in fade-in slide-in-from-right-4"
                    }`}
                  >
                    <Link href={`/recipes/${meal.recipe?.id}`} className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-100 active:bg-slate-100 transition-colors">
                      <p className="font-bold text-slate-900">{meal.recipe?.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-1">{meal.recipe?.description}</p>
                    </Link>
                    
                    {/* Dedicated Mobile Tap Target for Deletion */}
                    <button
                      onClick={() => removeMealFromPlan(meal.id)}
                      className="h-12 w-12 flex items-center justify-center bg-red-50 text-red-500 rounded-xl active:bg-red-500 active:text-white transition-all shadow-sm"
                      aria-label="Remove meal"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => setSelectedDate(`${index}`)}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-medium active:border-orange-300 active:text-orange-500 transition-all"
                >
                  + Add meal to {format(day, 'EEEE')}
                </button>
              </div>
            </section>
          ))}
        </div>

        {/* Floating Add Modal */}
        {selectedDate && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
              <h3 className="text-xl font-bold mb-4 text-slate-900">What's for dinner?</h3>
              <select
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-6 outline-none focus:border-orange-500"
                value={selectedRecipe}
                onChange={(e) => setSelectedRecipe(e.target.value)}
              >
                <option value="">Select a recipe...</option>
                {recipes.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
              <div className="flex gap-4">
                <button onClick={() => addMealToPlan(selectedRecipe, parseInt(selectedDate))} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform">Add to Plan</button>
                <button onClick={() => setSelectedDate('')} className="px-6 py-4 text-slate-500 font-bold">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Bar for easy access on mobile */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-slate-200 px-6 py-3 rounded-full shadow-2xl flex gap-8 z-40">
        <Link href="/" className="text-xs font-bold uppercase tracking-widest text-slate-400">Home</Link>
        <Link href="/meal-plan" className="text-xs font-bold uppercase tracking-widest text-orange-600">Plan</Link>
        <Link href="/shopping-list" className="text-xs font-bold uppercase tracking-widest text-slate-400">List</Link>
      </footer>
    </main>
  );
}