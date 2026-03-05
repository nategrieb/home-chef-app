"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import RecipeCard from '../components/RecipeCard';
import Link from 'next/link';

export default function Home() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecipes() {
      // We fetch recipes AND their related ingredients in one call
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          ingredients (calories)
        `)
        .order('created_at', { ascending: false });

      if (data) setRecipes(data);
      setLoading(false);
    }
    fetchRecipes();
  }, []);

  return (
    <main className="max-w-2xl mx-auto p-8 font-serif">
      <header className="flex justify-between items-end mb-12 border-b-2 border-black pb-4">
        <div>
          <h1 className="text-5xl font-bold tracking-tighter">THE MENU</h1>
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mt-2">Kitchen of Grieb</p>
        </div>
        <Link href="/add-recipe" className="text-sm font-bold uppercase border-2 border-black px-4 py-2 hover:bg-black hover:text-white transition">
          + Add
        </Link>
      </header>

      {loading ? (
        <p className="italic text-gray-400">Consulting the chef...</p>
      ) : (
        <div className="space-y-2">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </main>
  );
}