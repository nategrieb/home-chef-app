"use client";
import { useState } from 'react';
import { supabase } from '../../lib/supabase'; // Correct relative path
import Link from 'next/link';

export default function AddRecipe() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState([{ item_name: '', amount: 0, unit: 'g', calories: 0 }]);

  const saveRecipe = async () => {
    if (!title) return alert("Please add a title");

    // 1. Save the main recipe
    const { data: recipe, error } = await supabase
      .from('recipes')
      .insert([{ title, description }])
      .select()
      .single();

    if (error) return alert("Error: " + error.message);

    // 2. Save ingredients linked to this recipe
    const ingsWithId = ingredients.map(ing => ({
    recipe_id: recipe.id,
    item_name: ing.item_name,
    amount: Number(ing.amount) || 0,
    unit: ing.unit || 'g',
    calories_per_unit: Number(ing.calories) || 0 // Map 'calories' to 'calories_per_unit'
    }));

const { error: ingError } = await supabase.from('ingredients').insert(ingsWithId);

    if (!ingError) {
      alert("Recipe added!");
      window.location.href = "/"; // Go back to the menu
    }
  };

  return (
    <main className="p-10 max-w-xl mx-auto font-serif">
      <Link href="/" className="text-xs uppercase tracking-widest text-gray-400 hover:text-black transition">← Back to Menu</Link>
      <h1 className="text-4xl italic border-b mb-8 pb-2 mt-4">Add New Recipe</h1>
      
      <div className="space-y-6">
        <input 
          placeholder="RECIPE NAME" 
          className="w-full text-2xl outline-none border-b border-transparent focus:border-gray-300 transition"
          onChange={(e) => setTitle(e.target.value)}
        />
        
        <textarea 
          placeholder="Short description..." 
          className="w-full h-20 outline-none resize-none italic text-gray-600"
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="pt-4">
          <h3 className="text-xs tracking-widest uppercase font-bold text-gray-400 mb-4">Ingredients & Nutrition</h3>
          {ingredients.map((ing, i) => (
            <div key={i} className="flex gap-4 mb-2">
              <input 
                placeholder="Item" 
                className="flex-1 border-b p-1" 
                onChange={(e) => {
                  const items = [...ingredients];
                  items[i].item_name = e.target.value;
                  setIngredients(items);
                }} 
              />
              <input 
                placeholder="Cals" 
                type="number"
                className="w-20 border-b text-right p-1" 
                onChange={(e) => {
                  const items = [...ingredients];
                  items[i].calories = Number(e.target.value);
                  setIngredients(items);
                }} 
              />
            </div>
          ))}
          <button 
            type="button"
            onClick={() => setIngredients([...ingredients, { item_name: '', amount: 0, unit: 'g', calories: 0 }])}
            className="text-xs uppercase text-orange-600 mt-2 font-bold"
          >
            + Add Ingredient
          </button>
        </div>

        <button 
          onClick={saveRecipe}
          className="w-full bg-black text-white py-4 mt-10 hover:bg-gray-800 transition uppercase tracking-widest"
        >
          Save to Cookbook
        </button>
      </div>
    </main>
  );
}