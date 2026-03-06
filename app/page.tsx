"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import RecipeCard from '../components/RecipeCard';
import Link from 'next/link';

interface Ingredient {
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

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecipes() {
      // 1. Updated 'calories' to 'calories_per_unit' to match your DB
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          ingredients (calories_per_unit)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase Error:", error.message);
        // Fallback: If the join fails, just fetch the recipes alone 
        // so the screen isn't blank
        const { data: fallbackData } = await supabase
          .from('recipes')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (fallbackData) setRecipes(fallbackData);
      } else if (data) {
        setRecipes(data);
      }
      
      setLoading(false);
    }
    fetchRecipes();
  }, []);

  const deleteRecipe = async (id: string) => {
    try {
      // First delete ingredients (due to foreign key constraints)
      await supabase.from('ingredients').delete().eq('recipe_id', id);
      
      // Then delete the recipe
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      
      if (error) {
        alert("Error deleting recipe: " + error.message);
      } else {
        // Update local state to remove the recipe from the UI
        setRecipes(recipes.filter(recipe => recipe.id !== id));
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete recipe");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 sm:mb-16 border-b border-slate-200 pb-6 sm:pb-8 gap-4">
          <div>
            <h1 className="text-4xl sm:text-6xl font-light tracking-tight text-slate-900 mb-2">The Menu</h1>
            <p className="text-sm font-medium text-slate-500 tracking-wider uppercase">Kitchen of Grieb</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="flex gap-3">
              <Link href="/meal-plan" className="flex-1 sm:flex-none px-4 sm:px-6 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 border border-slate-200 hover:border-slate-300 text-center">
                Meal Plan
              </Link>
              <Link href="/shopping-list" className="flex-1 sm:flex-none px-4 sm:px-6 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 border border-slate-200 hover:border-slate-300 text-center">
                Shopping List
              </Link>
            </div>
            <Link href="/add-recipe" className="w-full sm:w-auto px-6 py-3 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-center">
              + Add Recipe
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center py-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-4"></div>
            <p className="text-slate-500 font-medium">Loading your recipes...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {recipes.length > 0 ? (
              recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} onDelete={deleteRecipe} />
              ))
            ) : (
              <div className="text-center py-32">
                <div className="w-24 h-24 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-slate-900 mb-2">Your cookbook is empty</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">Start building your collection of favorite recipes. Add your first one to get cooking!</p>
                <Link href="/add-recipe" className="inline-flex items-center px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-all duration-200 shadow-sm hover:shadow-md">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Your First Recipe
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Mobile bottom spacing */}
        <div className="h-20 sm:h-8"></div>

        {/* Mobile-Optimized Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-4 py-3 sm:px-8 sm:py-4 flex justify-around sm:justify-center sm:gap-8 sm:hidden">
          <Link href="/" className="flex flex-col items-center gap-1 text-xs font-medium text-slate-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </Link>
          <Link href="/meal-plan" className="flex flex-col items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Plan
          </Link>
          <Link href="/shopping-list" className="flex flex-col items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            List
          </Link>
          <Link href="/add-recipe" className="flex flex-col items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add
          </Link>
        </nav>

        {/* Desktop Navigation (hidden on mobile) */}
        <nav className="hidden sm:flex fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-lg border border-slate-200 rounded-2xl shadow-lg px-8 py-4 gap-8">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </Link>
          <Link href="/meal-plan" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Plan
          </Link>
          <Link href="/shopping-list" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            List
          </Link>
        </nav>
      </div>
    </main>
  );
}
