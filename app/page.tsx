"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import RecipeCard from '../components/RecipeCard';
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
        <button 
          onClick={async () => {
            // Create a blank recipe record
            const { data: recipe, error } = await supabase
              .from('recipes')
              .insert([{
                title: 'New Recipe',
                description: '',
                servings: 4,
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