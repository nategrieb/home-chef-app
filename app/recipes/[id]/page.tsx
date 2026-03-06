"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format, startOfWeek } from 'date-fns';

interface Ingredient {
  item_name: string;
  amount: number;
  unit: string;
  calories_per_unit: number;
}

interface Recipe {
  id: string;
  title: string;
  description?: string;
  servings?: number;
  serving_unit?: string;
  ingredients?: Ingredient[];
}

export default function RecipeDetail() {
  const params = useParams();
  const recipeId = params.id as string;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servingAmount, setServingAmount] = useState<number>(4);
  const [servingUnit, setServingUnit] = useState<string>('servings');
  const [ingredients, setIngredients] = useState([{ item_name: '', amount: 0, unit: 'g' }]);

  // Get the current week starting from Monday (local dates)
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  // Create local dates without timezone issues
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return date;
  });

  const servingUnits = [
    'servings',
    'people',
    'pieces',
    'cookies',
    'muffins',
    'loaves',
    'cups',
    'pints',
    'quarts',
    'gallons',
    'slices',
    'bars',
    'balls',
    'scoops'
  ];

  useEffect(() => {
    async function fetchRecipe() {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          ingredients (*)
        `)
        .eq('id', recipeId)
        .single();

      if (error) {
        console.error("Error fetching recipe:", error);
      } else if (data) {
        setRecipe(data);
        // Initialize form state with recipe data
        setTitle(data.title || '');
        setDescription(data.description || '');
        setServingAmount(data.servings || 4);
        setServingUnit(data.serving_unit || 'servings');
        setIngredients(data.ingredients && data.ingredients.length > 0
          ? data.ingredients.map((ing: { item_name: string; amount: number; unit: string }) => ({
              item_name: ing.item_name || '',
              amount: ing.amount || 0,
              unit: ing.unit || 'g'
            }))
          : [{ item_name: '', amount: 0, unit: 'g' }]
        );
      }

      setLoading(false);
    }

    if (recipeId) {
      fetchRecipe();
    }
  }, [recipeId]);

  const saveRecipe = async () => {
    if (!title) return alert("Please add a title");

    // Update existing recipe
    const { error: recipeError } = await supabase
      .from('recipes')
      .update({
        title,
        description,
        servings: servingAmount,
        serving_unit: servingUnit
      })
      .eq('id', recipeId);

    if (recipeError) return alert("Error updating recipe: " + recipeError.message);

    // Delete existing ingredients and add new ones
    await supabase.from('ingredients').delete().eq('recipe_id', recipeId);

    const ingsWithId = ingredients.map(ing => ({
      recipe_id: recipeId,
      item_name: ing.item_name,
      amount: Number(ing.amount) || 0,
      unit: ing.unit || 'g',
      calories_per_unit: 0 // Placeholder, will be implemented later
    }));

    const { error: ingError } = await supabase.from('ingredients').insert(ingsWithId);

    if (!ingError) {
      alert("Recipe updated!");
      setIsEditing(false);
      // Refresh the recipe data
      window.location.reload();
    }
  };

  const cancelEdit = () => {
    if (recipe) {
      setTitle(recipe.title || '');
      setDescription(recipe.description || '');
      setServingAmount(recipe.servings || 4);
      setServingUnit(recipe.serving_unit || 'servings');
      setIngredients(recipe.ingredients && recipe.ingredients.length > 0
        ? recipe.ingredients.map((ing: { item_name: string; amount: number; unit: string }) => ({
            item_name: ing.item_name || '',
            amount: ing.amount || 0,
            unit: ing.unit || 'g'
          }))
        : [{ item_name: '', amount: 0, unit: 'g' }]
      );
    }
    setIsEditing(false);
  };

  const addToMealPlan = async (dayIndex: number) => {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    try {
      const { error } = await supabase
        .from('meal_plans')
        .insert([{
          recipe_id: recipeId,
          day_of_week: dayIndex
        }]);

      if (error) {
        console.error("Error adding to meal plan:", error);
        alert("Error adding recipe to meal plan. Please make sure the meal_plans table exists in your database.");
      } else {
        alert(`Recipe added to meal plan for ${dayNames[dayIndex]}!`);
        setShowMealPlanModal(false);
        setSelectedDate('');
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!recipe) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="text-center py-32">
            <h1 className="text-2xl font-medium text-slate-900 mb-4">Recipe not found</h1>
            <Link href="/" className="text-slate-600 hover:text-slate-900 underline">
              ← Back to recipes
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Menu
          </Link>
          <h1 className="text-4xl font-light text-slate-900 mb-2">{isEditing ? "Edit Recipe" : (recipe?.title || "Recipe")}</h1>
          <p className="text-slate-600">
            {isEditing
              ? "Update your recipe details and ingredients."
              : "View and manage your recipe details."
            }
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <div className="space-y-8">
            {/* Recipe Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
                Recipe Name
              </label>
              {isEditing ? (
                <input
                  id="title"
                  type="text"
                  placeholder="e.g., Grandma's Chocolate Chip Cookies"
                  className="w-full px-4 py-3 text-lg border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 outline-none bg-white text-slate-900 placeholder:text-slate-500"
                  onChange={(e) => setTitle(e.target.value)}
                  value={title}
                />
              ) : (
                <div className="text-3xl font-light text-slate-900">{recipe?.title}</div>
              )}
            </div>

            {/* Recipe Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              {isEditing ? (
                <textarea
                  id="description"
                  placeholder="A brief description of your recipe, cooking tips, or story behind it..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 outline-none resize-none bg-white text-slate-900 placeholder:text-slate-500"
                  rows={4}
                  onChange={(e) => setDescription(e.target.value)}
                  value={description}
                />
              ) : (
                recipe?.description && (
                  <p className="text-slate-600 leading-relaxed">{recipe.description}</p>
                )
              )}
            </div>

            {/* Serving Size */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Serving Size
              </label>
              {isEditing ? (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="number"
                      placeholder="Amount"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 outline-none bg-white text-slate-900 placeholder:text-slate-500"
                      value={servingAmount}
                      onChange={(e) => setServingAmount(Number(e.target.value) || 1)}
                      min="1"
                    />
                  </div>
                  <div className="flex-1">
                    <select
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 outline-none bg-white text-slate-900"
                      value={servingUnit}
                      onChange={(e) => setServingUnit(e.target.value)}
                    >
                      {servingUnits.map(unit => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-6 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="font-medium">
                      Serves {recipe?.servings || 4} {recipe?.serving_unit || 'servings'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Ingredients Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-900">Ingredients</h3>
                <span className="text-sm text-slate-500">{ingredients.length} items</span>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  {ingredients.map((ing, i) => (
                    <div key={i} className="flex gap-3 items-end">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Ingredient name"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 outline-none bg-white text-slate-900 placeholder:text-slate-500"
                          value={ing.item_name}
                          onChange={(e) => {
                            const items = [...ingredients];
                            items[i].item_name = e.target.value;
                            setIngredients(items);
                          }}
                        />
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          placeholder="Qty"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 outline-none bg-white text-slate-900 placeholder:text-slate-500 text-right"
                          value={ing.amount || ''}
                          onChange={(e) => {
                            const items = [...ingredients];
                            items[i].amount = Number(e.target.value);
                            setIngredients(items);
                          }}
                        />
                      </div>
                      <div className="w-16">
                        <input
                          type="text"
                          placeholder="Unit"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 outline-none bg-white text-slate-900 placeholder:text-slate-500 text-center text-sm"
                          value={ing.unit}
                          onChange={(e) => {
                            const items = [...ingredients];
                            items[i].unit = e.target.value;
                            setIngredients(items);
                          }}
                        />
                      </div>
                      {ingredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const items = ingredients.filter((_, index) => index !== i);
                            setIngredients(items);
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                          aria-label="Remove ingredient"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIngredients([...ingredients, { item_name: '', amount: 0, unit: 'g' }])}
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Ingredient
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recipe?.ingredients && recipe.ingredients.length > 0 ? (
                    recipe.ingredients.map((ingredient, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-slate-300 rounded-full flex-shrink-0"></div>
                          <span className="text-slate-900 font-medium">{ingredient.item_name}</span>
                        </div>
                        <div className="text-slate-600 text-sm font-medium">
                          {ingredient.amount} {ingredient.unit}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 italic">No ingredients listed</p>
                  )}
                </div>
              )}
            </div>

            {/* Instructions Placeholder */}
            {!isEditing && (
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Instructions
                </h3>

                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-slate-900 mb-2">Instructions Coming Soon</h4>
                  <p className="text-slate-500 max-w-sm mx-auto">
                    We&apos;re working on adding step-by-step cooking instructions to make your cooking experience even better.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-6 border-t border-slate-200">
              {isEditing ? (
                <div className="flex gap-3">
                  <button
                    onClick={saveRecipe}
                    className="flex-1 bg-slate-900 text-white py-3 px-6 font-medium rounded-lg hover:bg-slate-800 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Update Recipe
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex-1 bg-white text-slate-700 py-3 px-6 font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full bg-slate-900 text-white py-3 px-6 font-medium rounded-lg hover:bg-slate-800 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Edit Recipe
                  </button>
                  <button
                    onClick={() => setShowMealPlanModal(true)}
                    className="w-full bg-white text-slate-700 py-3 px-6 font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition-all duration-200"
                  >
                    Add to Meal Plan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile-friendly bottom spacing */}
        <div className="h-8"></div>
      </div>

      {/* Meal Plan Modal - Mobile Optimized */}
      {showMealPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                Add &ldquo;{recipe?.title}&rdquo; to Meal Plan
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select a day this week
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                    {weekDays.map((day, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedDate(`${index}`)}
                        className={`p-3 text-left rounded-lg border transition-all duration-200 ${
                          selectedDate === `${index}`
                            ? 'border-slate-500 bg-slate-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-medium text-slate-900">
                          {format(day, 'EEEE')}
                        </div>
                        <div className="text-sm text-slate-500">
                          {format(day, 'MMM d, yyyy')}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      if (selectedDate) {
                        addToMealPlan(parseInt(selectedDate));
                      }
                    }}
                    disabled={!selectedDate}
                    className="flex-1 bg-slate-900 text-white py-3 px-4 font-medium rounded-lg hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Add to Plan
                  </button>
                  <button
                    onClick={() => {
                      setShowMealPlanModal(false);
                      setSelectedDate('');
                    }}
                    className="flex-1 bg-white text-slate-700 py-3 px-4 font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}