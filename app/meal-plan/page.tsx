"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { format, startOfWeek } from 'date-fns';
import MobileNav from '../../components/MobileNav';

export default function MealPlan() {
  const [mealPlans, setMealPlans] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedRecipe, setSelectedRecipe] = useState<string>('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
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
    if (!recipeId) return;
    const { error } = await supabase.from('meal_plans').insert([{ recipe_id: recipeId, day_of_week: dayIndex }]);
    if (!error) { fetchData(); setSelectedDate(''); setSelectedRecipe(''); }
  }

  async function removeMealFromPlan(mealPlanId: string) {
    setRemovingId(mealPlanId);
    setTimeout(async () => {
      await supabase.from('meal_plans').delete().eq('id', mealPlanId);
      setMealPlans(prev => prev.filter(p => p.id !== mealPlanId));
      setRemovingId(null);
    }, 300);
  }

  if (loading) return <div className="p-20 text-center text-slate-900 font-bold">Loading Plan...</div>;

  return (
    <main className="min-h-screen bg-slate-50 pb-40 px-6 pt-10">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 leading-tight tracking-tighter">Weekly Plan</h1>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Kitchen of Grieb</p>
      </header>

      <div className="space-y-6">
        {weekDays.map((day, index) => (
          <section key={index} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center font-black uppercase text-[10px] tracking-widest text-slate-400">
              <span>{format(day, 'EEEE')}</span>
              <span>{format(day, 'MMM d')}</span>
            </div>
            <div className="p-4 space-y-3">
              {mealPlans.filter(p => p.day_of_week === index).map((meal) => (
                <div key={meal.id} className={`flex items-center gap-3 transition-all duration-300 ${removingId === meal.id ? "opacity-0 -translate-x-full" : "opacity-100"}`}>
                  <Link href={`/recipes/${meal.recipe?.id}`} className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100 active:bg-slate-100 font-bold text-slate-900">
                    {meal.recipe?.title}
                  </Link>
                  <button onClick={() => removeMealFromPlan(meal.id)} className="h-14 w-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center font-black shadow-sm">×</button>
                </div>
              ))}
              <button onClick={() => setSelectedDate(`${index}`)} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-black uppercase tracking-widest active:border-[#004225] active:text-[#004225] transition-all">
                + Add Meal
              </button>
            </div>
          </section>
        ))}
      </div>

      {/* Add Meal Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-10 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <h3 className="text-2xl font-black mb-6 text-black">What's for dinner?</h3>
            <select 
              className="w-full p-5 bg-white border-2 border-slate-300 rounded-3xl text-black font-black outline-none mb-8 appearance-none" 
              value={selectedRecipe} 
              onChange={e => setSelectedRecipe(e.target.value)}
              style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
            >
              <option value="">Select a recipe...</option>
              {recipes.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
            <div className="flex gap-4">
              <button onClick={() => addMealToPlan(selectedRecipe, parseInt(selectedDate))} disabled={!selectedRecipe} className="flex-[2] bg-[#004225] text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl disabled:bg-slate-200 transition-all">Add to Plan</button>
              <button onClick={() => setSelectedDate('')} className="flex-1 text-slate-400 font-black uppercase text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}
      <MobileNav />
    </main>
  );
}