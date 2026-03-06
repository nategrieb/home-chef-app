"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

interface Recipe {
  id: string;
  title: string;
  servings?: number;
  serving_unit?: string;
}

interface MealPlan {
  id: string;
  recipe_id: string;
  planned_date: string;
  recipe?: Recipe;
}

export default function MealPlan() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Get the current week starting from Monday
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  async function fetchMealPlans() {
    const { data, error } = await supabase
      .from('meal_plans')
      .select(`
        *,
        recipes (*)
      `)
      .gte('planned_date', weekStart.toISOString().split('T')[0])
      .lt('planned_date', addDays(weekStart, 7).toISOString().split('T')[0]);

    if (error) {
      console.error("Error fetching meal plans:", error);
    } else {
      setMealPlans(data || []);
    }
  }

  async function fetchRecipes() {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('title');

    if (error) {
      console.error("Error fetching recipes:", error);
    } else {
      setRecipes(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMealPlans();
    fetchRecipes();
  }, []);

  async function addMealToPlan(recipeId: string, date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd');

    const { error } = await supabase
      .from('meal_plans')
      .insert([{
        recipe_id: recipeId,
        planned_date: dateStr
      }]);

    if (error) {
      console.error("Error adding meal to plan:", error);
      alert("Error adding meal to plan");
    } else {
      fetchMealPlans(); // Refresh the meal plans
      setSelectedRecipe('');
      setSelectedDate('');
    }
  }

  async function removeMealFromPlan(mealPlanId: string) {
    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', mealPlanId);

    if (error) {
      console.error("Error removing meal from plan:", error);
      alert("Error removing meal from plan");
    } else {
      fetchMealPlans(); // Refresh the meal plans
    }
  }

  const getMealsForDate = (date: Date) => {
    return mealPlans.filter(plan =>
      isSameDay(new Date(plan.planned_date), date)
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Menu
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-light text-slate-900 mb-2">Weekly Meal Plan</h1>
              <p className="text-slate-600">
                Plan your meals for the week and generate a shopping list.
              </p>
            </div>
            <Link
              href="/shopping-list"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Shopping List
            </Link>
          </div>
        </div>

        {/* Weekly Calendar */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6 mb-8">
          {weekDays.map((day, index) => (
            <div key={index} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-medium text-slate-900">
                  {format(day, 'EEE')}
                </h3>
                <p className="text-sm text-slate-500">
                  {format(day, 'MMM d')}
                </p>
              </div>

              <div className="space-y-3 mb-4">
                {getMealsForDate(day).map((meal) => (
                  <div key={meal.id} className="group relative bg-slate-50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-slate-900 truncate">
                          {meal.recipe?.title}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Serves {meal.recipe?.servings || 4}
                        </p>
                      </div>
                      <button
                        onClick={() => removeMealFromPlan(meal.id)}
                        className="ml-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all duration-200"
                        aria-label="Remove meal"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setSelectedDate(format(day, 'yyyy-MM-dd'));
                }}
                className="w-full py-2 px-3 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 border border-dashed border-slate-300 hover:border-slate-400"
              >
                + Add Meal
              </button>
            </div>
          ))}
        </div>

        {/* Add Meal Modal */}
        {selectedDate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                Add Meal for {format(new Date(selectedDate), 'EEEE, MMM d')}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Recipe
                  </label>
                  <select
                    value={selectedRecipe}
                    onChange={(e) => setSelectedRecipe(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 bg-white text-slate-900"
                  >
                    <option value="">Choose a recipe...</option>
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      if (selectedRecipe) {
                        addMealToPlan(selectedRecipe, new Date(selectedDate));
                      }
                    }}
                    disabled={!selectedRecipe}
                    className="flex-1 bg-slate-900 text-white py-2 px-4 font-medium rounded-lg hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Add to Plan
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDate('');
                      setSelectedRecipe('');
                    }}
                    className="flex-1 bg-white text-slate-700 py-2 px-4 font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}