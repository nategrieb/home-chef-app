"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import RecipeCard from '../components/RecipeCard';
import MobileNav from '../components/MobileNav';
import Header from '../components/Header';
import { buildShoppingStateKey, inferCanonicalIngredient } from '../lib/ingredient-normalization';
import Link from 'next/link';

const DIET_OPTIONS = [
  'Vegan',
  'Vegetarian',
  'Gluten-Free',
  'Pescetarian',
  'Dairy-Free',
  'Nut-Free',
  'Low-Carb',
] as const;

const DIET_EMOJI: Record<(typeof DIET_OPTIONS)[number], string> = {
  Vegan: '🌱',
  Vegetarian: '🥕',
  'Gluten-Free': '🌾',
  Pescetarian: '🐟',
  'Dairy-Free': '🥛',
  'Nut-Free': '🥜',
  'Low-Carb': '🥖',
};

const WEEKDAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

interface CurrentOrder {
  order_title: string;
  order_notes?: string | null;
  updated_at?: string | null;
}

export default function Home() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [dietaryFilter, setDietaryFilter] = useState<'all' | (typeof DIET_OPTIONS)[number]>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'alphabetical'>('newest');
  const [pendingPlanRecipeId, setPendingPlanRecipeId] = useState<string | null>(null);
  const [pendingPlanDayIndex, setPendingPlanDayIndex] = useState<number>((new Date().getDay() + 6) % 7);
  const [currentOrder, setCurrentOrder] = useState<CurrentOrder | null>(null);

  useEffect(() => {
    async function fetchRecipes() {
      const [{ data }, { data: orderData }] = await Promise.all([
        supabase.from('recipes').select(`*, ingredients (calories_per_unit)`).order('created_at', { ascending: false }),
        supabase
          .from('current_orders')
          .select('order_title, order_notes, updated_at')
          .eq('id', 'current')
          .maybeSingle(),
      ]);

      if (data) setRecipes(data);
      if (orderData?.order_title?.trim()) {
        setCurrentOrder(orderData as CurrentOrder);
      } else {
        setCurrentOrder(null);
      }
      setLoading(false);
    }
    fetchRecipes();
  }, []);
  // Filter and sort recipes based on current state
  useEffect(() => {
    let filtered = [...recipes];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(recipe => {
        // Search in title and description
        const titleMatch = recipe.title?.toLowerCase().includes(query);
        const descriptionMatch = recipe.description?.toLowerCase().includes(query);
        
        // Search in ingredients
        const ingredientMatch = recipe.ingredients?.some((ing: any) => 
          ing.item_name?.toLowerCase().includes(query)
        );

        return titleMatch || descriptionMatch || ingredientMatch;
      });
    }

    // Apply dietary preference filter
    if (dietaryFilter !== 'all') {
      filtered = filtered.filter((recipe) => {
        if (!recipe.dietary_preference) return false;

        const diets = Array.isArray(recipe.dietary_preference)
          ? recipe.dietary_preference
          : [recipe.dietary_preference];

        return diets.includes(dietaryFilter);
      });
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(recipe => recipe.category === categoryFilter);
    }

    // apply sort
    if (sortBy === 'alphabetical') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      // newest first
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setFilteredRecipes(filtered);
  }, [recipes, searchQuery, dietaryFilter, categoryFilter, sortBy]);

  const activeFilterCount =
    (dietaryFilter !== 'all' ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0);
  const addRecipeToPlan = async (recipeId: string, dayIndex: number) => {
    const { error } = await supabase.from('meal_plans').insert([{ recipe_id: recipeId, day_of_week: dayIndex }]);

    if (error) {
      alert('Could not add this recipe to the plan. Please try again.');
      return;
    }

    // Keep shopping state aligned with newly added meals.
    const { data: recipeIngredients } = await supabase
      .from('ingredients')
      .select('item_name, unit, canonical_name')
      .eq('recipe_id', recipeId);

    const ingredientNames = Array.from(
      new Set(
        (recipeIngredients || [])
          .map((row: { item_name: string; unit?: string; canonical_name?: string | null }) => {
            const canonical = row.canonical_name?.trim() || inferCanonicalIngredient(row.item_name || '');
            return buildShoppingStateKey(canonical, row.unit || 'item');
          })
          .filter(Boolean)
      )
    );

    if (ingredientNames.length > 0) {
      await supabase
        .from('shopping_list_state')
        .upsert(
          ingredientNames.map((itemName) => ({
            item_name: itemName,
            is_checked: false,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'item_name' }
        );
    }

    alert(`Added to ${WEEKDAY_OPTIONS[dayIndex]}.`);
  };

  const openAddToPlanPicker = (recipeId: string) => {
    setPendingPlanDayIndex((new Date().getDay() + 6) % 7);
    setPendingPlanRecipeId(recipeId);
  };

  const confirmAddToPlan = async () => {
    if (!pendingPlanRecipeId) return;
    await addRecipeToPlan(pendingPlanRecipeId, pendingPlanDayIndex);
    setPendingPlanRecipeId(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-white to-slate-100 pb-44 px-4 sm:px-6 pt-8 sm:pt-10">
      <Header>
        <button 
          onClick={async () => {
            // Create a blank recipe record
            const { data: recipe, error } = await supabase
              .from('recipes')
              .insert([{
                title: 'New Recipe',
                description: '',
                instructions: ['']
              }])
              .select()
              .single();

            if (error) {
              console.error('Error creating blank recipe:', error);
              alert('Error creating new recipe. Please try again.');
              return;
            }

            // Create a single blank ingredient
            await supabase.from('ingredients').insert([{
              recipe_id: recipe.id,
              item_name: '',
              amount: 0,
              unit: 'g',
              calories_per_unit: 0
            }]);

            // Redirect to the edit view
            window.location.href = `/recipes/${recipe.id}?edit=true`;
          }}
          className="quiet-action w-12 h-12 text-xl font-black"
          title="Add New Recipe"
        >
          +
          <span aria-hidden="true" className="quiet-action-line" />
        </button>
      </Header>

      {currentOrder && (
        <section className="mb-8 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700 mb-1">Active Order</p>
              <h2 className="text-xl font-black text-slate-900 leading-tight">{currentOrder.order_title}</h2>
              {currentOrder.order_notes && (
                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{currentOrder.order_notes}</p>
              )}
              {currentOrder.updated_at && (
                <p className="text-xs text-slate-500 mt-2">Updated {new Date(currentOrder.updated_at).toLocaleString()}</p>
              )}
            </div>
            <Link
              href="/submit-order"
              className="quiet-action px-4 py-2.5 text-xs font-black"
            >
              View Order
              <span aria-hidden="true" className="quiet-action-line" />
            </Link>
          </div>
        </section>
      )}

      {/* Search + filter row */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search recipes, ingredients, or descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-[#004225] focus:border-transparent"
            />
          </div>

          <button
            onClick={() => {
              setShowFilters(false);
              setShowSort(prev => !prev);
            }}
            className="quiet-action flex-none p-2 text-sm font-semibold flex items-center justify-center rounded-full"
            aria-label="Toggle sort options"
          >
            {/* sort icon (vertical arrows) */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" className="h-5 w-5 text-slate-500">
              <path d="M5 7l5-5 5 5H5zm0 6l5 5 5-5H5z" />
            </svg>
          </button>

          <button
            onClick={() => {
              setShowSort(false);
              setShowFilters((prev) => !prev);
            }}
            className="quiet-action flex-none p-2 text-sm font-semibold flex items-center justify-center rounded-full"
            aria-label="Toggle filters"
          >
            {/* filter icon (funnel) */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 text-slate-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 14.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-6.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            <span className="ml-2 hidden sm:inline">
              Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </span>
            <span aria-hidden="true" className="quiet-action-line" />
          </button>
        </div>

        {showSort && (
          <div className="mt-3 bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
            <button
              onClick={() => {
                setSortBy('newest');
                setShowSort(false);
              }}
              className={`w-full text-left text-sm py-2 ${sortBy === 'newest' ? 'font-bold' : ''}`}
            >
              Newest first
            </button>
            <button
              onClick={() => {
                setSortBy('alphabetical');
                setShowSort(false);
              }}
              className={`w-full text-left text-sm py-2 ${sortBy === 'alphabetical' ? 'font-bold' : ''}`}
            >
              A‑Z
            </button>
          </div>
        )}

        {showFilters && (
          <div className="mt-3 bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={dietaryFilter}
                onChange={(e) => setDietaryFilter(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#004225] focus:border-transparent"
              >
                <option value="all">All Diets</option>
                {DIET_OPTIONS.map((diet) => (
                  <option key={diet} value={diet}>
                    {DIET_EMOJI[diet]} {diet}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#004225] focus:border-transparent"
              >
                <option value="all">All Meals</option>
                <option value="Breakfast">🍳 Breakfast</option>
                <option value="Lunch">🥗 Lunch</option>
                <option value="Dinner">🍽️ Dinner</option>
                <option value="Snack">🍿 Snack</option>
              </select>
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setDietaryFilter('all');
                  setCategoryFilter('all');
                }}
                className="quiet-action px-3 py-1 text-xs font-bold text-[#004225]"
              >
                Clear Filters
                <span aria-hidden="true" className="quiet-action-line" />
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-900 font-black animate-pulse uppercase tracking-widest">Consulting the Chef...</div>
      ) : (
        <div className="grid gap-4">
          {filteredRecipes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No recipes found</h3>
              <p className="text-slate-600">
                {searchQuery || dietaryFilter !== 'all' || categoryFilter !== 'all'
                  ? "Try adjusting your search or filters" 
                  : "Create your first recipe to get started"}
              </p>
            </div>
          ) : (
            filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} onAddToPlan={openAddToPlanPicker} />
            ))
          )}
        </div>
      )}

      {pendingPlanRecipeId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-1">Add To Plan</h3>
            <p className="text-sm text-slate-600 mb-4 line-clamp-1">
              {recipes.find((r) => r.id === pendingPlanRecipeId)?.title || 'Selected recipe'}
            </p>

            <select
              value={pendingPlanDayIndex}
              onChange={(e) => setPendingPlanDayIndex(parseInt(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 outline-none mb-4"
            >
              {WEEKDAY_OPTIONS.map((day, i) => (
                <option key={day} value={i}>{day}</option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmAddToPlan}
                className="quiet-action flex-1 py-3 text-sm font-black"
              >
                Add
                <span aria-hidden="true" className="quiet-action-line" />
              </button>
              <button
                type="button"
                onClick={() => setPendingPlanRecipeId(null)}
                className="quiet-action flex-1 py-3 text-sm font-bold"
              >
                Cancel
                <span aria-hidden="true" className="quiet-action-line" />
              </button>
            </div>
          </div>
        </div>
      )}
      <MobileNav />
    </main>
  );
}