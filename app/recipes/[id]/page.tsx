"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams, useSearchParams } from 'next/navigation';
import MobileNav from '../../../components/MobileNav';

export default function RecipeDetail() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [category, setCategory] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | ''>('');
  const [dietaryPreference, setDietaryPreference] = useState<'Vegan' | 'Vegetarian' | 'Gluten-Free' | 'Pescetarian' | 'Dairy-Free' | 'Nut-Free' | 'Keto' | 'Paleo' | 'Low-Carb' | ''>('');
  const [totalTime, setTotalTime] = useState<number | ''>('');
  const [tags, setTags] = useState<string[]>([]);
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
        setCategory(data.category || '');
        setDietaryPreference(data.dietary_preference || '');
        setTotalTime(data.total_time || '');
        setTags(data.tags || []);
        setIngredients(data.ingredients || []);
        setInstructions(data.instructions || []);

        // Auto-start editing for new recipes or when edit=true is in URL
        const shouldEdit = searchParams.get('edit') === 'true' || data.title === 'New Recipe';
        setIsEditing(shouldEdit);
      }
      setLoading(false);
    }
    fetchRecipe();
  }, [params.id, searchParams]);

  const saveChanges = async () => {
    // Filter out empty ingredients
    const validIngredients = ingredients.filter(ing => 
      ing.item_name.trim() !== '' && 
      (ing.amount !== '' || ing.unit.trim() !== '')
    );

    // Prevent saving if no valid ingredients remain and original recipe had ingredients
    if (validIngredients.length === 0 && recipe.ingredients && recipe.ingredients.length > 0) {
      alert('Cannot save recipe with no ingredients. Please add at least one ingredient or cancel editing.');
      return;
    }

    const { error } = await supabase
      .from('recipes')
      .update({ 
        title, 
        description, 
        source_url: sourceUrl, 
        category: category || null,
        dietary_preference: dietaryPreference || null,
        total_time: totalTime || null,
        tags: tags,
        instructions 
      })
      .eq('id', params.id);

    if (!error) {
      // Re-sync ingredients - only delete and re-insert if there are valid ingredients
      await supabase.from('ingredients').delete().eq('recipe_id', params.id);
      
      if (validIngredients.length > 0) {
        const ingsWithId = validIngredients.map(ing => ({ 
          item_name: ing.item_name.trim(), 
          amount: ing.amount || 0, 
          unit: ing.unit.trim() || 'g', 
          recipe_id: params.id, 
          calories_per_unit: 0 
        }));
        await supabase.from('ingredients').insert(ingsWithId);
      }
      
      setIsEditing(false);
      // For new recipes, redirect to home page after saving
      if (recipe?.title === 'New Recipe') {
        window.location.href = '/';
      } else {
        window.location.reload();
      }
    }
  };

  if (loading || !recipe) return <div className="p-20 text-center text-slate-900 font-bold">Loading...</div>;

  return (
    <main className="min-h-screen bg-white pb-40">
      {/* Floating Action Button for Edit/Save */}
      <div className="fixed bottom-24 right-6 z-50">
        <button 
          onClick={() => isEditing ? saveChanges() : setIsEditing(true)} 
          className="bg-[#004225] text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center font-black text-lg active:scale-95 transition-all hover:bg-[#003319]"
        >
          {isEditing ? "✓" : "✎"}
        </button>
      </div>

      {/* Cancel Button for New Recipes */}
      {isEditing && recipe?.title === 'New Recipe' && (
        <div className="fixed bottom-24 left-6 z-50">
          <button 
            onClick={async () => {
              if (confirm('Cancel creating this recipe? This will permanently delete the draft.')) {
                try {
                  // Delete ingredients first
                  await supabase.from('ingredients').delete().eq('recipe_id', params.id);
                  // Then delete the recipe
                  await supabase.from('recipes').delete().eq('id', params.id);
                  // Navigate back to home
                  window.location.href = '/';
                } catch (error) {
                  console.error('Error deleting draft recipe:', error);
                  alert('Error deleting draft. Please try again.');
                }
              }
            }} 
            className="bg-red-500 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center font-black text-lg active:scale-95 transition-all hover:bg-red-600"
            title="Cancel and Delete Draft"
          >
            ×
          </button>
        </div>
      )}

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
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="bg-white p-4 rounded-2xl text-black font-bold outline-none border-2 border-slate-300"
                  style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                >
                  <option value="">Select Category</option>
                  <option value="Breakfast">🍳 Breakfast</option>
                  <option value="Lunch">🥗 Lunch</option>
                  <option value="Dinner">🍽️ Dinner</option>
                  <option value="Snack">🍿 Snack</option>
                </select>
                <select
                  value={dietaryPreference}
                  onChange={e => setDietaryPreference(e.target.value as any)}
                  className="bg-white p-4 rounded-2xl text-black font-bold outline-none border-2 border-slate-300"
                  style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                >
                  <option value="">Select Diet</option>
                  <option value="Vegan">🌱 Vegan</option>
                  <option value="Vegetarian">🥕 Vegetarian</option>
                  <option value="Gluten-Free">🌾 Gluten-Free</option>
                  <option value="Pescetarian">🐟 Pescetarian</option>
                  <option value="Dairy-Free">🥛 Dairy-Free</option>
                  <option value="Nut-Free">🥜 Nut-Free</option>
                  <option value="Keto">🥑 Keto</option>
                  <option value="Paleo">🍖 Paleo</option>
                  <option value="Low-Carb">🥖 Low-Carb</option>
                </select>
              </div>
              <input
                type="number"
                value={totalTime}
                onChange={e => setTotalTime(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full bg-white p-4 rounded-2xl text-black font-bold outline-none border-2 border-slate-300"
                style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                placeholder="Total time (mins)"
                min="1"
              />
              <input
                value={tags.join(', ')}
                onChange={e => setTags(e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                className="w-full bg-white p-4 rounded-2xl text-black font-bold text-sm outline-none border-2 border-slate-300"
                style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                placeholder="Tags (comma separated: Vegetarian, Gluten-Free, One-Pot)"
              />
            </div>
          ) : (
            <>
              <p className="text-slate-700 text-lg leading-relaxed mb-6">{description || "No description provided."}</p>
              {sourceUrl && (
                <a href={sourceUrl} target="_blank" className="inline-flex items-center gap-2 bg-white text-[#004225] px-5 py-3 rounded-2xl border-2 border-slate-200 font-black uppercase text-xs active:scale-95 transition-all shadow-sm mb-4">
                  Source Article
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              )}
              <div className="flex flex-wrap gap-3 mb-4">
                {category && (
                  <span className="inline-flex items-center gap-2 bg-[#004225] text-white px-3 py-1 rounded-full text-xs font-black uppercase">
                    {category === 'Breakfast' && '🍳'} {category === 'Lunch' && '🥗'} {category === 'Dinner' && '🍽️'} {category === 'Snack' && '🍿'} {category}
                  </span>
                )}
                {dietaryPreference && (
                  <span className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                    {dietaryPreference === 'Vegan' && '🌱'}
                    {dietaryPreference === 'Vegetarian' && '🥕'}
                    {dietaryPreference === 'Gluten-Free' && '🌾'}
                    {dietaryPreference === 'Pescetarian' && '🐟'}
                    {dietaryPreference === 'Dairy-Free' && '🥛'}
                    {dietaryPreference === 'Nut-Free' && '🥜'}
                    {dietaryPreference === 'Keto' && '🥑'}
                    {dietaryPreference === 'Paleo' && '🍖'}
                    {dietaryPreference === 'Low-Carb' && '🥖'}
                    {dietaryPreference}
                  </span>
                )}
                {totalTime && (
                  <span className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">
                    ⏱️ {totalTime} mins
                  </span>
                )}
              </div>
              {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span key={index} className="bg-slate-200 text-slate-800 px-3 py-1 rounded-full text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 rounded-2xl p-1 mb-8 border border-slate-200">
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${
              activeTab === 'ingredients'
                ? 'bg-[#004225] text-white shadow-lg'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🥕 Ingredients
          </button>
          <button
            onClick={() => setActiveTab('instructions')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${
              activeTab === 'instructions'
                ? 'bg-[#004225] text-white shadow-lg'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👨‍🍳 Instructions
          </button>
        </div>

        {/* Ingredients Section with Unit Input */}
        {activeTab === 'ingredients' && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#004225] rounded-full flex items-center justify-center">
              <span className="text-white font-black text-sm">🥕</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-widest text-slate-900">Ingredients</h2>
            {isEditing && (
              <span className="text-sm text-slate-500 font-medium">({ingredients.length} items)</span>
            )}
          </div>
          <div className="space-y-3">
            {ingredients.map((ing: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                {isEditing ? (
                  <div className="flex gap-3 w-full items-center">
                    <input 
                      value={ing.item_name} 
                      placeholder="Ingredient name"
                      onChange={e => { const n = [...ingredients]; n[i].item_name = e.target.value; setIngredients(n); }} 
                      className="flex-1 bg-white border border-slate-300 p-3 rounded-lg font-bold text-black outline-none" 
                      style={{ color: '#000000', backgroundColor: '#FFFFFF' }} 
                    />
                    <input 
                      value={ing.amount} 
                      placeholder="Qty"
                      onChange={e => { const n = [...ingredients]; n[i].amount = e.target.value; setIngredients(n); }} 
                      className="w-16 bg-white border border-slate-300 p-3 rounded-lg text-center font-bold text-black outline-none" 
                      style={{ color: '#000000', backgroundColor: '#FFFFFF' }} 
                    />
                    <input 
                      value={ing.unit} 
                      placeholder="Unit"
                      onChange={e => { const n = [...ingredients]; n[i].unit = e.target.value; setIngredients(n); }} 
                      className="w-16 bg-white border border-slate-300 p-3 rounded-lg text-center font-bold text-black outline-none" 
                      style={{ color: '#000000', backgroundColor: '#FFFFFF' }} 
                    />
                    <button onClick={() => setIngredients(ingredients.filter((_, idx) => idx !== i))} className="w-8 h-8 bg-red-100 text-red-600 rounded-full font-black text-sm hover:bg-red-200 transition-colors">×</button>
                  </div>
                ) : (
                  <label className="flex items-center gap-4 w-full cursor-pointer group">
                    <input type="checkbox" className="w-6 h-6 rounded-full border-2 border-slate-300 appearance-none checked:bg-[#004225] transition-all shrink-0" />
                    <span className="font-bold text-slate-900 group-has-[:checked]:text-slate-300 group-has-[:checked]:line-through flex-1">{ing.item_name}</span>
                    <span className="text-sm font-black text-slate-400 uppercase shrink-0">{ing.amount}{ing.unit}</span>
                  </label>
                )}
              </div>
            ))}
            {isEditing && (
              <button onClick={() => setIngredients([...ingredients, { item_name: '', amount: '', unit: 'g' }])} className="w-full bg-slate-100 text-[#004225] font-black text-sm uppercase p-4 rounded-2xl border-2 border-dashed border-slate-300 hover:bg-slate-200 transition-colors">+ Add Ingredient</button>
            )}
          </div>
        </section>
        )}

        {/* Instructions Section */}
        {activeTab === 'instructions' && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#004225] rounded-full flex items-center justify-center">
              <span className="text-white font-black text-sm">👨‍🍳</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-widest text-slate-900">Instructions</h2>
          </div>
          
          <div className="space-y-6">
            {instructions.map((step: string, i: number) => (
              <div key={i} className="flex gap-4">
                <span className="w-8 h-8 rounded-2xl bg-[#004225] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-lg">{i + 1}</span>
                {isEditing ? (
                  <div className="w-full relative">
                    <textarea 
                      value={step} 
                      onChange={e => { const n = [...instructions]; n[i] = e.target.value; setInstructions(n); }} 
                      className="w-full bg-white p-4 rounded-2xl text-black font-bold outline-none border-2 border-slate-300 resize-none" 
                      style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                      rows={3}
                    />
                    <button onClick={() => setInstructions(instructions.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full font-black text-xs">×</button>
                  </div>
                ) : (
                  <p className="text-lg text-slate-800 leading-relaxed font-medium pt-1 flex-1">{step}</p>
                )}
              </div>
            ))}
            {isEditing && (
              <button onClick={() => setInstructions([...instructions, ''])} className="w-full bg-slate-100 text-[#004225] font-black text-sm uppercase p-4 rounded-2xl border-2 border-dashed border-slate-300 hover:bg-slate-200 transition-colors">+ Add Step</button>
            )}
          </div>
        </section>
        )}
      </div>
      <MobileNav />
    </main>
  );
}