"use client";
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { startOfWeek, format } from 'date-fns';

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

  // Get the current week starting from Monday (local dates)
  const today = new Date();
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMealPlans();
  }, []);

  useEffect(() => {
    if (mealPlans.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      aggregateIngredients();
    } else {
      setAggregatedIngredients([]);
    }
  }, [mealPlans, aggregateIngredients]);

  // Group meals by day of week
  const mealsByDay = mealPlans.reduce((acc, meal) => {
    const dayIndex = meal.day_of_week;
    if (!acc[dayIndex]) {
      acc[dayIndex] = [];
    }
    acc[dayIndex].push(meal);
    return acc;
  }, {} as Record<number, MealPlan[]>);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/meal-plan" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Meal Plan
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-light text-slate-900 mb-2">Shopping List</h1>
              <p className="text-slate-600">
                {mealPlans.length > 0
                  ? `Ingredients for ${mealPlans.length} planned meal${mealPlans.length > 1 ? 's' : ''} this week`
                  : 'No meals planned yet'
                }
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">
                Week of {format(weekStart, 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>

        {mealPlans.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No meals planned</h3>
            <p className="text-slate-500 mb-6">
              Add some recipes to your meal plan to generate a shopping list.
            </p>
            <Link
              href="/meal-plan"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Plan Meals
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Planned Meals Summary */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-xl font-medium text-slate-900 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Planned Meals
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(mealsByDay).map(([dayIndex, meals]) => (
                  <div key={dayIndex} className="bg-slate-50 rounded-lg p-4">
                    <h3 className="font-medium text-slate-900 mb-2">
                      {dayNames[parseInt(dayIndex)]}
                    </h3>
                    <div className="space-y-1">
                      {meals.map((meal) => (
                        <Link
                          key={meal.id}
                          href={`/recipes/${meal.recipe?.id}`}
                          className="block text-sm text-slate-600 hover:text-slate-900 hover:underline transition-colors"
                        >
                          {meal.recipe?.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aggregated Ingredients */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-xl font-medium text-slate-900 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Shopping List
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({aggregatedIngredients.length} items)
                </span>
              </h2>

              {aggregatedIngredients.length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  No ingredients to display
                </p>
              ) : (
                <div className="space-y-4">
                  {aggregatedIngredients.map((ingredient, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded border-2 border-slate-300 flex items-center justify-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-slate-600 bg-gray-100 border-gray-300 rounded focus:ring-slate-500"
                          />
                        </div>
                        <div>
                          <span className="text-slate-900 font-medium">
                            {ingredient.item_name}
                          </span>
                          <div className="text-sm text-slate-500">
                            {ingredient.total_amount} {ingredient.unit}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-500">
                          Used in {ingredient.recipes.length} recipe{ingredient.recipes.length > 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-slate-400 max-w-32 truncate">
                          {ingredient.recipes.map(r => r.title).join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}