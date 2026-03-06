"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function RecipeDetail() {
  const params = useParams();
  const recipeId = params.id as string;
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState(''); // New field for original article
  const [ingredients, setIngredients] = useState<any[]>([]);

  useEffect(() => {
    async function fetchRecipe() {
      const { data, error } = await supabase
        .from('recipes')
        .select(`*, ingredients (*)`)
        .eq('id', recipeId)
        .single();

      if (data) {
        setRecipe(data);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setSourceUrl(data.source_url || ''); // Assuming we add this to your DB
        setIngredients(data.ingredients || []);
      }
      setLoading(false);
    }
    if (recipeId) fetchRecipe();
  }, [recipeId]);

  if (loading) return <div className="p-10 text-center animate-pulse">Loading recipe...</div>;

  return (
    <main className="min-h-screen bg-white pb-24 font-sans text-slate-900">
      {/* 1. Sticky Action Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 z-30 px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-slate-400 hover:text-slate-900 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex gap-4">
          <button onClick={() => setIsEditing(!isEditing)} className="text-sm font-bold uppercase tracking-widest text-orange-600">
            {isEditing ? "Save" : "Edit"}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-8">
        {/* 2. Header & Quick Context */}
        <header className="mb-10">
          <h1 className="text-4xl font-black tracking-tight mb-4 leading-tight">{title}</h1>
          
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <p className="text-slate-600 italic text-sm mb-4 leading-relaxed">
              {description || "No description provided."}
            </p>
            {sourceUrl && (
              <a 
                href={sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
              >
                View Original Article
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </header>

        {/* 3. Quick Navigation Jumps */}
        <div className="flex gap-2 mb-12 overflow-x-auto pb-2 scrollbar-hide">
          <a href="#ingredients" className="bg-slate-900 text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-tighter shrink-0">Ingredients</a>
          <a href="#instructions" className="bg-slate-100 text-slate-600 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-tighter shrink-0">Instructions</a>
        </div>

        {/* 4. Ingredients Section */}
        <section id="ingredients" className="mb-12 scroll-mt-24">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Ingredients</h2>
            <span className="text-slate-400 text-xs font-bold uppercase">{ingredients.length} Items</span>
          </div>
          
          <div className="space-y-1">
            {ingredients.map((ing, i) => (
              <label key={i} className="flex items-center gap-4 p-4 rounded-xl active:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group cursor-pointer">
                <input type="checkbox" className="w-6 h-6 rounded-full border-2 border-slate-200 checked:bg-orange-500 checked:border-orange-500 transition-all appearance-none shrink-0" />
                <div className="flex justify-between w-full items-center">
                  <span className="font-medium text-slate-800 group-has-[:checked]:text-slate-300 group-has-[:checked]:line-through transition-all capitalize">
                    {ing.item_name}
                  </span>
                  <span className="text-sm font-black text-slate-400 group-has-[:checked]:text-slate-200">
                    {ing.amount} {ing.unit}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* 5. Instructions Section */}
        <section id="instructions" className="scroll-mt-24">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-8">Instructions</h2>
          <div className="space-y-10">
            {/* Placeholder for steps - You'll need to add an 'instructions' column to your DB */}
            <div className="relative pl-12 border-l-2 border-slate-100 pb-2">
              <span className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">1</span>
              <p className="text-slate-700 leading-relaxed font-medium">Heat olive oil in a large pot over medium heat. Add onions and sauté until translucent.</p>
            </div>
            <div className="relative pl-12 border-l-2 border-slate-100 pb-2">
              <span className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm">2</span>
              <p className="text-slate-700 leading-relaxed font-medium text-lg">Stir in garlic, ginger, and turmeric. Cook for 1 minute until fragrant.</p>
            </div>
          </div>
        </section>
      </div>

      {/* Floating Bottom Nav */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-slate-200 px-6 py-3 rounded-full shadow-2xl flex gap-8 z-40">
        <Link href="/" className="text-xs font-bold uppercase tracking-widest text-slate-400">Home</Link>
        <Link href="/meal-plan" className="text-xs font-bold uppercase tracking-widest text-slate-400">Plan</Link>
        <Link href="/shopping-list" className="text-xs font-bold uppercase tracking-widest text-slate-400">List</Link>
      </footer>
    </main>
  );
}