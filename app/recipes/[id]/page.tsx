"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams } from 'next/navigation';
import MobileNav from '../../../components/MobileNav';

export default function RecipeDetail() {
  const params = useParams();
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);

  useEffect(() => {
    async function fetchRecipe() {
      const { data } = await supabase.from('recipes').select(`*, ingredients (*)`).eq('id', params.id).single();
      if (data) {
        setRecipe(data);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setSourceUrl(data.source_url || '');
        setIngredients(data.ingredients || []);
        setInstructions(data.instructions || []);
      }
      setLoading(false);
    }
    fetchRecipe();
  }, [params.id]);

  const saveChanges = async () => {
    const { error } = await supabase
      .from('recipes')
      .update({ title, description, source_url: sourceUrl, instructions })
      .eq('id', params.id);

    if (!error) {
      // Re-sync ingredients
      await supabase.from('ingredients').delete().eq('recipe_id', params.id);
      const ingsWithId = ingredients.map(ing => ({ 
        item_name: ing.item_name, 
        amount: ing.amount, 
        unit: ing.unit, 
        recipe_id: params.id, 
        calories_per_unit: 0 
      }));
      await supabase.from('ingredients').insert(ingsWithId);
      
      setIsEditing(false);
      window.location.reload();
    }
  };

  if (loading || !recipe) return <div className="p-20 text-center text-slate-900 font-bold">Loading...</div>;

  return (
    <main className="min-h-screen bg-white pb-40">
      {/* Sticky Navigation Jump Links */}
      <nav className="sticky top-0 bg-white/95 backdrop-blur-md z-40 border-b border-slate-100 flex justify-around p-4 shadow-sm">
        <a href="#ingredients" className="text-[10px] font-black uppercase tracking-widest text-slate-400 active:text-[#004225]">Ingredients</a>
        <a href="#instructions" className="text-[10px] font-black uppercase tracking-widest text-slate-400 active:text-[#004225]">Instructions</a>
        <button 
          onClick={() => isEditing ? saveChanges() : setIsEditing(true)} 
          className="text-[10px] font-black uppercase tracking-widest text-[#004225]"
        >
          {isEditing ? "Save" : "Edit"}
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-6 pt-10">
        <header className="mb-8">
          {isEditing ? (
            <input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full text-3xl font-black text-black border-2 border-[#004225] rounded-xl p-3 bg-white outline-none shadow-sm"
              style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
            />
          ) : (
            <h1 className="text-4xl font-black text-slate-900 leading-tight tracking-tighter">{title}</h1>
          )}
        </header>

        {/* Description Section */}
        <section className="bg-slate-100 rounded-3xl p-6 mb-12 border border-slate-200">
          {isEditing ? (
            <div className="space-y-4">
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                className="w-full bg-white p-4 rounded-2xl text-black font-bold outline-none border-2 border-slate-300 min-h-[100px]" 
                style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                placeholder="Description"
              />
              <input 
                value={sourceUrl} 
                onChange={e => setSourceUrl(e.target.value)} 
                className="w-full bg-white p-4 rounded-2xl text-black font-bold text-sm outline-none border-2 border-slate-300" 
                style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                placeholder="Source URL"
              />
            </div>
          ) : (
            <>
              <p className="text-slate-700 text-lg leading-relaxed mb-6">{description || "No description provided."}</p>
              {sourceUrl && (
                <a href={sourceUrl} target="_blank" className="inline-flex items-center gap-2 bg-white text-[#004225] px-5 py-3 rounded-2xl border-2 border-slate-200 font-black uppercase text-xs active:scale-95 transition-all shadow-sm">
                  Source Article
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              )}
            </>
          )}
        </section>

        {/* Ingredients Section with Unit Input */}
        <section id="ingredients" className="mb-12 scroll-mt-24">
          <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 mb-6 border-l-4 border-[#004225] pl-4">Ingredients</h2>
          <div className="space-y-2">
            {ingredients.map((ing: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                {isEditing ? (
                  <div className="flex gap-2 w-full">
                    <input 
                      value={ing.item_name} 
                      placeholder="Item"
                      onChange={e => { const n = [...ingredients]; n[i].item_name = e.target.value; setIngredients(n); }} 
                      className="flex-1 bg-white border border-slate-300 p-2 rounded-lg font-black text-black outline-none" 
                      style={{ color: '#000000', backgroundColor: '#FFFFFF' }} 
                    />
                    <input 
                      value={ing.amount} 
                      placeholder="Qty"
                      onChange={e => { const n = [...ingredients]; n[i].amount = e.target.value; setIngredients(n); }} 
                      className="w-14 bg-white border border-slate-300 p-2 rounded-lg text-center font-black text-black outline-none" 
                      style={{ color: '#000000', backgroundColor: '#FFFFFF' }} 
                    />
                    <input 
                      value={ing.unit} 
                      placeholder="Unit"
                      onChange={e => { const n = [...ingredients]; n[i].unit = e.target.value; setIngredients(n); }} 
                      className="w-14 bg-white border border-slate-300 p-2 rounded-lg text-center font-black text-black outline-none" 
                      style={{ color: '#000000', backgroundColor: '#FFFFFF' }} 
                    />
                    <button onClick={() => setIngredients(ingredients.filter((_, idx) => idx !== i))} className="text-red-500 font-black p-2">×</button>
                  </div>
                ) : (
                  <label className="flex items-center gap-4 w-full cursor-pointer group">
                    <input type="checkbox" className="w-6 h-6 rounded-full border-2 border-slate-300 appearance-none checked:bg-[#004225] transition-all shrink-0" />
                    <span className="font-bold text-slate-900 group-has-[:checked]:text-slate-300 group-has-[:checked]:line-through">{ing.item_name}</span>
                    <span className="ml-auto text-xs font-black text-slate-400 uppercase">{ing.amount}{ing.unit}</span>
                  </label>
                )}
              </div>
            ))}
            {isEditing && (
              <button onClick={() => setIngredients([...ingredients, { item_name: '', amount: '', unit: 'g' }])} className="text-[#004225] font-black text-xs uppercase p-4">+ Add Ingredient</button>
            )}
          </div>
        </section>

        {/* Instructions Section */}
        <section id="instructions" className="scroll-mt-24">
          <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 mb-8 border-l-4 border-slate-900 pl-4">Instructions</h2>
          <div className="space-y-10">
            {instructions.map((step: string, i: number) => (
              <div key={i} className="flex gap-6">
                <span className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black shrink-0 shadow-lg">{i + 1}</span>
                {isEditing ? (
                  <div className="w-full relative">
                    <textarea 
                      value={step} 
                      onChange={e => { const n = [...instructions]; n[i] = e.target.value; setInstructions(n); }} 
                      className="w-full bg-white p-4 rounded-2xl text-black font-bold outline-none border-2 border-slate-300" 
                      style={{ color: '#000000', backgroundColor: '#FFFFFF' }} 
                    />
                    <button onClick={() => setInstructions(instructions.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full font-black text-xs">×</button>
                  </div>
                ) : (
                  <p className="text-xl text-slate-800 leading-snug font-medium pt-1">{step}</p>
                )}
              </div>
            ))}
            {isEditing && (
               <button onClick={() => setInstructions([...instructions, ''])} className="text-[#004225] font-black text-xs uppercase tracking-widest">+ Add Step</button>
            )}
          </div>
        </section>
      </div>
      <MobileNav />
    </main>
  );
}