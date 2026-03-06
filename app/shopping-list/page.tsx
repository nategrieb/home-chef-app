"use client";
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { startOfWeek, format } from 'date-fns';
import MobileNav from '../../components/MobileNav';

interface Ingredient {
  item_name: string;
  amount: number;
  unit: string;
  recipe_id: string;
  recipe_title?: string;
}

interface AggregatedIngredient {
  item_name: string;
  total_amount: number;
  unit: string;
  recipes: { title: string; amount: number }[];
}

interface MealPlan {
  id: string;
  recipe_id: string;
  day_of_week: number;
  recipe?: {
    id: string;
    title: string;
    ingredients?: Ingredient[];
  };
}

export default function ShoppingList() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [aggregatedIngredients, setAggregatedIngredients] = useState<AggregatedIngredient[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();  // Get the current week starting from Monday (local dates)
  
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  async function fetchMealPlans() {
    const { data, error } = await supabase
      .from('meal_plans')
      .select(`
        *,
        recipe:recipes (
          id,
          title,
          ingredients (*)
        )
      `)
      .order('day_of_week');

    if (error) {
      console.error("Error fetching meal plans:", error);
    } else {
      setMealPlans(data || []);
    }
    setLoading(false);
  }

  const aggregateIngredients = useCallback(() => {
    const ingredientMap = new Map<string, AggregatedIngredient>();

    mealPlans.forEach((meal) => {
      if (meal.recipe?.ingredients) {
        meal.recipe.ingredients.forEach((ingredient) => {
          const key = `${ingredient.item_name.toLowerCase()}-${ingredient.unit}`;

          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)!;
            existing.total_amount += ingredient.amount;
            existing.recipes.push({
              title: meal.recipe!.title,
              amount: ingredient.amount
            });
          } else {
            ingredientMap.set(key, {
              item_name: ingredient.item_name,
              total_amount: ingredient.amount,
              unit: ingredient.unit,
              recipes: [{
                title: meal.recipe!.title,
                amount: ingredient.amount
              }]
            });
          }
        });
      }
    });

    const sortedIngredients = Array.from(ingredientMap.values()).sort((a, b) =>
      a.item_name.localeCompare(b.item_name)
    );

    setAggregatedIngredients(sortedIngredients);
  }, [mealPlans]);

  useEffect(() => {
    fetchMealPlans();
  }, []);

  useEffect(() => {
    if (mealPlans.length > 0) {
      aggregateIngredients();
    } else {
      setAggregatedIngredients([]);
    }
  }, [mealPlans, aggregateIngredients]);

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-6 py-32 text-center text-slate-900 font-bold animate-pulse">
          Generating list...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-32">
      <div className="max-w-4xl mx-auto px-6 pt-8">
        {/* Header */}
        <div className="mb-10">
          <Link href="/meal-plan" className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-4 inline-block">
            ← Back to Plan
          </Link>
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black text-slate-900 leading-tight">Shopping List</h1>
              <p className="text-slate-500 font-bold text-sm uppercase tracking-tight">
                Week of {format(weekStart, 'MMM d, yyyy')}
              </p>
            </div>
            <div className="text-right">
               <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                {aggregatedIngredients.length} Items
              </span>
            </div>
          </div>
        </div>

        {mealPlans.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">The list is empty</h3>
            <p className="text-slate-500 mb-6">Add meals to your plan to generate a list.</p>
            <Link href="/meal-plan" className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold uppercase tracking-widest active:scale-95 transition-all">
              Plan Meals
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Aggregated Ingredients Checklist */}
            <div className="space-y-2">
              {aggregatedIngredients.map((ingredient, index) => (
                <label 
                  key={index} 
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 active:bg-orange-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <input 
                      type="checkbox" 
                      className="w-6 h-6 rounded-full border-2 border-slate-300 appearance-none checked:bg-orange-500 transition-all shrink-0" 
                    />
                    <div>
                      <span className="font-bold text-slate-900 text-lg group-has-[:checked]:text-slate-300 group-has-[:checked]:line-through block capitalize">
                        {ingredient.item_name}
                      </span>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight group-has-[:checked]:text-slate-200">
                        {ingredient.recipes.map(r => r.title).join(' • ')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-slate-500 font-black text-sm group-has-[:checked]:text-slate-200">
                      {ingredient.total_amount} {ingredient.unit}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            {/* Meals Reference Section */}
            <div className="mt-12 pt-8 border-t border-slate-100">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Planned Recipes</h2>
              <div className="grid grid-cols-1 gap-3">
                {mealPlans.map((meal) => (
                  <Link 
                    key={meal.id} 
                    href={`/recipes/${meal.recipe?.id}`}
                    className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl active:bg-slate-50 transition-colors shadow-sm"
                  >
                    <span className="font-bold text-slate-900">{meal.recipe?.title}</span>
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <MobileNav />
    </main>
  );
}