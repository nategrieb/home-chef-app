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
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Creating your new recipe...</p>
      </div>
    </main>
  );
}