"use client";
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function AddRecipe() {
  const router = useRouter();

  useEffect(() => {
    async function createBlankRecipe() {
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
        router.push('/');
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
      router.push(`/recipes/${recipe.id}?edit=true`);
    }

    createBlankRecipe();
  }, [router]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/60 flex items-center justify-center px-6">
      <div className="text-center bg-white border border-slate-200 rounded-3xl shadow-sm px-8 py-10 w-full max-w-sm">
        <p className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
          New Recipe
        </p>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004225] mx-auto mb-4"></div>
        <p className="text-slate-700 font-semibold">Creating your new recipe...</p>
      </div>
    </main>
  );
}