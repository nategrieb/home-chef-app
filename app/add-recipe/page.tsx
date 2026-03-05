"use client";
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '../../lib/supabase'; // Correct relative path
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function AddRecipeForm() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = !!editId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servingAmount, setServingAmount] = useState<number>(4);
  const [servingUnit, setServingUnit] = useState<string>('servings');
  const [ingredients, setIngredients] = useState([{ item_name: '', amount: 0, unit: 'g' }]);
  const [loading, setLoading] = useState(isEditing);

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

  // Load existing recipe data if editing
  useEffect(() => {
    if (isEditing && editId) {
      async function loadRecipe() {
        const { data, error } = await supabase
          .from('recipes')
          .select(`
            *,
            ingredients (*)
          `)
          .eq('id', editId)
          .single();

        if (error) {
          console.error("Error loading recipe:", error);
          alert("Error loading recipe for editing");
          window.location.href = "/";
          return;
        }

        if (data) {
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

      loadRecipe();
    }
  }, [isEditing, editId]);

  const saveRecipe = async () => {
    if (!title) return alert("Please add a title");

    if (isEditing && editId) {
      // Update existing recipe
      const { error: recipeError } = await supabase
        .from('recipes')
        .update({
          title,
          description,
          servings: servingAmount,
          serving_unit: servingUnit
        })
        .eq('id', editId);

      if (recipeError) return alert("Error updating recipe: " + recipeError.message);

      // Delete existing ingredients and add new ones
      await supabase.from('ingredients').delete().eq('recipe_id', editId);

      const ingsWithId = ingredients.map(ing => ({
        recipe_id: editId,
        item_name: ing.item_name,
        amount: Number(ing.amount) || 0,
        unit: ing.unit || 'g',
        calories_per_unit: 0 // Placeholder, will be implemented later
      }));

      const { error: ingError } = await supabase.from('ingredients').insert(ingsWithId);

      if (!ingError) {
        alert("Recipe updated!");
        window.location.href = `/recipes/${editId}`; // Go back to recipe detail
      }
    } else {
      // Create new recipe
      const { data: recipe, error } = await supabase
        .from('recipes')
        .insert([{
          title,
          description,
          servings: servingAmount,
          serving_unit: servingUnit
        }])
        .select()
        .single();

      if (error) return alert("Error: " + error.message);

      // 2. Save ingredients linked to this recipe (without calories for now)
      const ingsWithId = ingredients.map(ing => ({
        recipe_id: recipe.id,
        item_name: ing.item_name,
        amount: Number(ing.amount) || 0,
        unit: ing.unit || 'g',
        calories_per_unit: 0 // Placeholder, will be implemented later
      }));

      const { error: ingError } = await supabase.from('ingredients').insert(ingsWithId);

      if (!ingError) {
        alert("Recipe added!");
        window.location.href = "/"; // Go back to the menu
      }
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8">
          <Link href={isEditing ? `/recipes/${editId}` : "/"} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {isEditing ? "Back to Recipe" : "Back to Menu"}
          </Link>
          <h1 className="text-4xl font-light text-slate-900 mb-2">{isEditing ? "Edit Recipe" : "Add New Recipe"}</h1>
          <p className="text-slate-600">
            {isEditing
              ? "Update your recipe details and ingredients."
              : "Share your culinary creation with detailed ingredients and instructions."
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
              <input
                id="title"
                type="text"
                placeholder="e.g., Grandma's Chocolate Chip Cookies"
                className="w-full px-4 py-3 text-lg border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 outline-none bg-white text-slate-900 placeholder:text-slate-500"
                onChange={(e) => setTitle(e.target.value)}
                value={title}
              />
            </div>

            {/* Recipe Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                placeholder="A brief description of your recipe, cooking tips, or story behind it..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 outline-none resize-none bg-white text-slate-900 placeholder:text-slate-500"
                rows={4}
                onChange={(e) => setDescription(e.target.value)}
                value={description}
              />
            </div>

            {/* Serving Size */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Serving Size
              </label>
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
            </div>

            {/* Ingredients Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-900">Ingredients</h3>
                <span className="text-sm text-slate-500">{ingredients.length} items</span>
              </div>

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
              </div>

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

            {/* Save Button */}
            <div className="pt-6 border-t border-slate-200">
              <button
                onClick={saveRecipe}
                className="w-full bg-slate-900 text-white py-3 px-6 font-medium rounded-lg hover:bg-slate-800 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {isEditing ? "Update Recipe" : "Save to Cookbook"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AddRecipe() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        </div>
      </main>
    }>
      <AddRecipeForm />
    </Suspense>
  );
}