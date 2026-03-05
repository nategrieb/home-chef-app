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
    <main className="max-w-2xl mx-auto p-8 font-serif">
      <header className="flex justify-between items-end mb-12 border-b-2 border-black pb-4">
        <div>
          <h1 className="text-5xl font-bold tracking-tighter uppercase">The Menu</h1>
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mt-2">Kitchen of Grieb</p>
        </div>
        <div className="flex gap-4">
           <Link href="/menu" className="text-sm font-bold uppercase border-2 border-gray-200 px-4 py-2 hover:border-black transition">
            Plan
          </Link>
          <Link href="/add-recipe" className="text-sm font-bold uppercase border-2 border-black px-4 py-2 hover:bg-black hover:text-white transition">
            + Add
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center py-20">
          <p className="italic text-gray-400 animate-pulse">Consulting the chef...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recipes.length > 0 ? (
            recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} onDelete={deleteRecipe} />
            ))
          ) : (
            <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-xl">
              <p className="text-gray-400 italic">The cookbook is empty.</p>
              <Link href="/add-recipe" className="text-orange-600 text-sm font-bold uppercase mt-2 inline-block">
                Add your first recipe
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Navigation Footer for easy access on mobile */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border border-gray-200 px-6 py-3 rounded-full shadow-xl flex gap-8">
        <Link href="/" className="text-xs font-bold uppercase tracking-widest">Home</Link>
        <Link href="/menu" className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black">Weekly Plan</Link>
        <Link href="/shopping-list" className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black">List</Link>
      </footer>
    </main>
  );
}
