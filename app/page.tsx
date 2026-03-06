"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import RecipeCard from '../components/RecipeCard';
import MobileNav from '../components/MobileNav';

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

export default function Home() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | (typeof DIET_OPTIONS)[number]>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'under-30' | '30-60' | 'over-60'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical' | 'servings-high' | 'servings-low'>('newest');

  useEffect(() => {
    async function fetchRecipes() {
      const { data } = await supabase.from('recipes').select(`*, ingredients (calories_per_unit)`).order('created_at', { ascending: false });
      if (data) setRecipes(data);
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

    // Apply time filter
    if (timeFilter !== 'all') {
      filtered = filtered.filter(recipe => {
        const time = recipe.total_time;
        if (!time) return false;
        switch (timeFilter) {
          case 'under-30': return time < 30;
          case '30-60': return time >= 30 && time <= 60;
          case 'over-60': return time > 60;
          default: return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'servings-high':
          return (b.servings || 4) - (a.servings || 4);
        case 'servings-low':
          return (a.servings || 4) - (b.servings || 4);
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredRecipes(filtered);
  }, [recipes, searchQuery, dietaryFilter, categoryFilter, timeFilter, sortBy]);
  const deleteRecipe = async (id: string) => {
    await supabase.from('ingredients').delete().eq('recipe_id', id);
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (!error) setRecipes(recipes.filter(r => r.id !== id));
  };

  return (
    <main className="min-h-screen bg-white pb-40 px-6 pt-10">
      <header className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase italic">The Menu</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Kitchen of Grieb</p>
        </div>
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
          className="bg-[#004225] text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center font-black text-xl active:scale-95 transition-all hover:bg-[#003319]"
          title="Add New Recipe"
        >
          +
        </button>
      </header>

      {/* Search and Filter Controls */}
      <div className="mb-8 space-y-4">
        {/* Search Bar */}
        <div className="relative">
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

        {/* Filter and Sort Controls */}
        <div className="flex flex-wrap gap-3">
          {/* Dietary Preference Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Diet:</span>
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
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Meal:</span>
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

          {/* Time Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Time:</span>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#004225] focus:border-transparent"
            >
              <option value="all">Any Time</option>
              <option value="under-30">Under 30 mins</option>
              <option value="30-60">30-60 mins</option>
              <option value="over-60">Over 60 mins</option>
            </select>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#004225] focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="alphabetical">A-Z</option>
              <option value="servings-high">Most Servings</option>
              <option value="servings-low">Fewest Servings</option>
            </select>
          </div>
        </div>
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
                {searchQuery || dietaryFilter !== 'all' || categoryFilter !== 'all' || timeFilter !== 'all'
                  ? "Try adjusting your search or filters" 
                  : "Create your first recipe to get started"}
              </p>
            </div>
          ) : (
            filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} onDelete={deleteRecipe} />
            ))
          )}
        </div>
      )}
      <MobileNav />
    </main>
  );
}