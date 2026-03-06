"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import RecipeCard from '../components/RecipeCard';
import Link from 'next/link';
import MobileNav from '../components/MobileNav';

export default function Home() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecipes() {
      const { data } = await supabase.from('recipes').select(`*, ingredients (calories_per_unit)`).order('created_at', { ascending: false });
      if (data) setRecipes(data);
      setLoading(false);
    }
    fetchRecipes();
  }, []);

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
        <Link href="/add-recipe" className="bg-[#004225] text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">
          + Add
        </Link>
      </header>

      {loading ? (
        <div className="py-20 text-center text-slate-900 font-black animate-pulse uppercase tracking-widest">Consulting the Chef...</div>
      ) : (
        <div className="grid gap-4">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onDelete={deleteRecipe} />
          ))}
        </div>
      )}
      <MobileNav />
    </main>
  );
}