"use client";
import { useEffect, useState, type KeyboardEvent } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams, useSearchParams } from 'next/navigation';
import MobileNav from '../../../components/MobileNav';
import { inferCanonicalIngredient, inferPreparationNote } from '../../../lib/ingredient-normalization';

const DIET_OPTIONS = [
  'Vegan',
  'Vegetarian',
  'Gluten-Free',
  'Pescetarian',
  'Dairy-Free',
  'Nut-Free',
  'Low-Carb',
] as const;

const UNIT_OPTIONS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'pcs', 'pinch', 'clove', 'slice', 'can'] as const;
const WEEKDAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

const DIET_EMOJI: Record<(typeof DIET_OPTIONS)[number], string> = {
  Vegan: '🌱',
  Vegetarian: '🥕',
  'Gluten-Free': '🌾',
  Pescetarian: '🐟',
  'Dairy-Free': '🥛',
  'Nut-Free': '🥜',
  'Low-Carb': '🥖',
};

type DietOption = (typeof DIET_OPTIONS)[number];

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
  const [dietaryPreference, setDietaryPreference] = useState<DietOption[]>([]);
  const [totalTime, setTotalTime] = useState<number | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [planDayIndex, setPlanDayIndex] = useState<number>((new Date().getDay() + 6) % 7);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [showManageActions, setShowManageActions] = useState(false);

  const hydrateForm = (data: any) => {
    setTitle(data.title || '');
    setDescription(data.description || '');
    setSourceUrl(data.source_url || '');
    setCategory(data.category || '');
    if (Array.isArray(data.dietary_preference)) {
      setDietaryPreference(data.dietary_preference as DietOption[]);
    } else if (data.dietary_preference) {
      setDietaryPreference([data.dietary_preference as DietOption]);
    } else {
      setDietaryPreference([]);
    }
    setTotalTime(data.total_time || '');
    setTags(data.tags || []);
    setIngredients(data.ingredients || []);
    setInstructions(data.instructions || []);
  };

  useEffect(() => {
    async function fetchRecipe() {
      const { data } = await supabase.from('recipes').select(`*, ingredients (*)`).eq('id', params.id).single();
      if (data) {
        setRecipe(data);
        hydrateForm(data);

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
        dietary_preference: dietaryPreference.length ? dietaryPreference : null,
        total_time: totalTime || null,
        tags: tags,
        instructions 
      })
      .eq('id', params.id);

    if (error) {
      const details = [error.message, error.details, error.hint].filter(Boolean).join('\n');
      console.error('Error saving recipe:', error);
      alert(`Could not save recipe.\n${details}`);
      return;
    }

    // Re-sync ingredients - only delete and re-insert if there are valid ingredients
    await supabase.from('ingredients').delete().eq('recipe_id', params.id);
    
    if (validIngredients.length > 0) {
        const ingsWithId = validIngredients.map(ing => {
          const normalizedName = ing.item_name.trim();
          const canonicalName = inferCanonicalIngredient(normalizedName);

          return {
            canonical_name: canonicalName,
            preparation_note: inferPreparationNote(normalizedName, canonicalName),
            item_name: normalizedName,
            amount: ing.amount || 0,
            unit: ing.unit.trim() || 'g',
            recipe_id: params.id,
            calories_per_unit: 0,
          };
        });
      await supabase.from('ingredients').insert(ingsWithId);
    }
    
    setIsEditing(false);
    // For new recipes, redirect to home page after saving
    if (recipe?.title === 'New Recipe') {
      window.location.href = '/';
    } else {
      window.location.reload();
    }
  };

  const toggleDiet = (diet: DietOption) => {
    setDietaryPreference((current) =>
      current.includes(diet)
        ? current.filter((value) => value !== diet)
        : [...current, diet]
    );
  };

  const focusRecipeIngredientName = (index: number) => {
    window.requestAnimationFrame(() => {
      const input = document.getElementById(`recipe-ingredient-name-${index}`) as HTMLInputElement | null;
      input?.focus();
    });
  };

  const appendRecipeIngredient = (focusNewRow = false) => {
    let nextIndex = 0;
    setIngredients((prev) => {
      nextIndex = prev.length;
      return [...prev, { item_name: '', amount: '', unit: 'g' }];
    });

    if (focusNewRow) {
      window.setTimeout(() => focusRecipeIngredientName(nextIndex), 0);
    }
  };

  const handleRecipeIngredientEnter = (
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    index: number
  ) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    if (index === ingredients.length - 1) {
      appendRecipeIngredient(true);
      return;
    }

    focusRecipeIngredientName(index + 1);
  };

  const focusRecipeInstruction = (index: number) => {
    window.requestAnimationFrame(() => {
      const input = document.getElementById(`recipe-instruction-${index}`) as HTMLTextAreaElement | null;
      input?.focus();
    });
  };

  const appendRecipeInstruction = (focusNewRow = false) => {
    let nextIndex = 0;
    setInstructions((prev) => {
      nextIndex = prev.length;
      return [...prev, ''];
    });

    if (focusNewRow) {
      window.setTimeout(() => focusRecipeInstruction(nextIndex), 0);
    }
  };

  const handleRecipeInstructionEnter = (
    event: KeyboardEvent<HTMLTextAreaElement>,
    index: number
  ) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();

    if (index === instructions.length - 1) {
      appendRecipeInstruction(true);
      return;
    }

    focusRecipeInstruction(index + 1);
  };

  const addToPlan = async () => {
    const { error } = await supabase
      .from('meal_plans')
      .insert([{ recipe_id: params.id, day_of_week: planDayIndex }]);

    if (error) {
      alert('Could not add this recipe to the meal plan. Please try again.');
      return;
    }

    setShowPlanPicker(false);
    alert(`Added to ${WEEKDAY_OPTIONS[planDayIndex]}.`);
  };

  const openPlanPicker = () => {
    setPlanDayIndex((new Date().getDay() + 6) % 7);
    setShowPlanPicker(true);
  };

  const deleteRecipeRecord = async () => {
    if (!confirm(`Delete \"${title}\" permanently?`)) return;

    const confirmDelete = prompt('Type DELETE to confirm.');
    if (confirmDelete !== 'DELETE') return;

    await supabase.from('meal_plans').delete().eq('recipe_id', params.id);
    await supabase.from('ingredients').delete().eq('recipe_id', params.id);

    const { error } = await supabase.from('recipes').delete().eq('id', params.id);

    if (error) {
      alert('Could not delete this recipe. Please try again.');
      return;
    }

    window.location.href = '/';
  };

  const deleteDraftRecipe = async () => {
    if (!confirm('Cancel creating this recipe? This will permanently delete the draft.')) return;

    try {
      await supabase.from('ingredients').delete().eq('recipe_id', params.id);
      await supabase.from('recipes').delete().eq('id', params.id);
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting draft recipe:', error);
      alert('Error deleting draft. Please try again.');
    }
  };

  const startEditing = () => {
    setShowManageActions(false);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (recipe?.title === 'New Recipe') {
      void deleteDraftRecipe();
      return;
    }

    if (recipe) {
      hydrateForm(recipe);
    }
    setIsEditing(false);
  };

  if (loading || !recipe) return <div className="p-20 text-center text-slate-900 font-bold">Loading...</div>;

  return (
    <main className="min-h-screen bg-white pb-44">
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

        {isEditing && (
          <div className="sticky top-4 z-40 mb-6 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Editing Recipe</p>
              <p className="text-xs text-slate-400">Save before leaving this page</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={saveChanges}
                className="quiet-action w-full sm:w-auto px-4 py-2.5 text-sm font-black"
              >
                Save Changes
                <span aria-hidden="true" className="quiet-action-line" />
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                className="quiet-action w-full sm:w-auto px-4 py-2.5 text-sm font-bold"
              >
                {recipe?.title === 'New Recipe' ? 'Cancel Draft' : 'Cancel'}
                <span aria-hidden="true" className="quiet-action-line" />
              </button>
            </div>
          </div>
        )}

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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
                <div className="bg-white p-3 rounded-2xl border-2 border-slate-300 self-start">
                  <p className="text-xs uppercase tracking-wide text-slate-500 font-bold mb-2">Category</p>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full bg-white p-3 rounded-xl text-black font-bold outline-none border-2 border-slate-300 min-h-[48px]"
                    style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="">Select Category</option>
                    <option value="Breakfast">🍳 Breakfast</option>
                    <option value="Lunch">🥗 Lunch</option>
                    <option value="Dinner">🍽️ Dinner</option>
                    <option value="Snack">🍿 Snack</option>
                  </select>
                </div>
                <div className="bg-white p-3 rounded-2xl border-2 border-slate-300 self-start">
                  <p className="text-xs uppercase tracking-wide text-slate-500 font-bold mb-2">Dietary Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {DIET_OPTIONS.map((diet) => {
                      const isSelected = dietaryPreference.includes(diet);
                      return (
                        <button
                          key={diet}
                          type="button"
                          onClick={() => toggleDiet(diet)}
                          className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold border transition-colors ${
                            isSelected
                              ? 'bg-[#004225] text-white border-[#004225]'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {DIET_EMOJI[diet]} {diet}
                        </button>
                      );
                    })}
                  </div>
                </div>
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
              <div className="mb-5 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={openPlanPicker}
                  className="quiet-action w-full sm:w-auto px-5 py-3 text-sm font-black"
                >
                  + Add to Plan
                  <span aria-hidden="true" className="quiet-action-line" />
                </button>
                <button
                  type="button"
                  onClick={() => { window.location.href = `/submit-order?recipeId=${params.id}&autoload=1`; }}
                  className="quiet-action w-full sm:w-auto px-5 py-3 text-sm font-black"
                >
                  Order
                  <span aria-hidden="true" className="quiet-action-line" />
                </button>
              </div>

              <div className="flex flex-wrap gap-3 mb-5">
                {category && (
                  <span className="inline-flex items-center gap-2 bg-[#004225] text-white px-3 py-1 rounded-full text-xs font-black uppercase">
                    {category === 'Breakfast' && '🍳'} {category === 'Lunch' && '🥗'} {category === 'Dinner' && '🍽️'} {category === 'Snack' && '🍿'} {category}
                  </span>
                )}
                {dietaryPreference.length > 0 && dietaryPreference.map((diet) => (
                  <span key={diet} className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                    {DIET_EMOJI[diet]} {diet}
                  </span>
                ))}
                {totalTime && (
                  <span className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">
                    ⏱️ {totalTime} mins
                  </span>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
                <p className="text-slate-700 text-lg leading-relaxed">{description || "No description provided."}</p>
              </div>

              {sourceUrl && (
                <a href={sourceUrl} target="_blank" className="quiet-action inline-flex items-center gap-2 px-5 py-3 text-xs font-black mb-4">
                  Source Article
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  <span aria-hidden="true" className="quiet-action-line" />
                </a>
              )}
              {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {tags.map((tag, index) => (
                    <span key={index} className="bg-slate-200 text-slate-800 px-3 py-1 rounded-full text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowManageActions((current) => !current)}
                  className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showManageActions ? 'Hide Manage' : 'Manage Recipe'}
                </button>
                {showManageActions && (
                  <div className="mt-2 pt-3 border-t border-slate-200">
                    <div className="mb-3">
                      <button
                        type="button"
                        onClick={startEditing}
                        className="text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        Edit Recipe
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={deleteRecipeRecord}
                      className="text-xs font-bold uppercase tracking-wider text-red-600 hover:text-red-700 transition-colors"
                    >
                      Delete Recipe
                    </button>
                  </div>
                )}
              </div>
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
            Ingredients
          </button>
          <button
            onClick={() => setActiveTab('instructions')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${
              activeTab === 'instructions'
                ? 'bg-[#004225] text-white shadow-lg'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Instructions
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
                  <div className="grid gap-3 w-full">
                    <input 
                      id={`recipe-ingredient-name-${i}`}
                      value={ing.item_name} 
                      placeholder="Ingredient name"
                      onChange={e => { const n = [...ingredients]; n[i].item_name = e.target.value; setIngredients(n); }} 
                      onKeyDown={(e) => handleRecipeIngredientEnter(e, i)}
                      className="w-full bg-white border border-slate-300 p-3 rounded-lg font-bold text-black outline-none min-w-0" 
                      style={{ color: '#000000', backgroundColor: '#FFFFFF' }} 
                    />
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 sm:grid-cols-[96px_1fr_auto] sm:max-w-sm">
                      <input 
                        value={ing.amount} 
                        placeholder="Qty"
                        onChange={e => { const n = [...ingredients]; n[i].amount = e.target.value; setIngredients(n); }} 
                        onKeyDown={(e) => handleRecipeIngredientEnter(e, i)}
                        className="w-full min-w-0 bg-white border border-slate-300 p-3 rounded-lg text-center font-bold text-black outline-none" 
                        style={{ color: '#000000', backgroundColor: '#FFFFFF' }} 
                      />
                      <select
                        value={ing.unit || 'g'}
                        onChange={e => { const n = [...ingredients]; n[i].unit = e.target.value; setIngredients(n); }}
                        onKeyDown={(e) => handleRecipeIngredientEnter(e, i)}
                        className="w-full min-w-0 bg-white border border-slate-300 p-3 rounded-lg text-center font-bold text-black outline-none"
                        style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                      >
                        {ing.unit && !UNIT_OPTIONS.includes(ing.unit) && <option value={ing.unit}>{ing.unit}</option>}
                        {UNIT_OPTIONS.map((unit) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                      <button onClick={() => setIngredients(ingredients.filter((_, idx) => idx !== i))} className="w-9 h-9 bg-red-100 text-red-600 rounded-full font-black text-sm hover:bg-red-200 transition-colors">×</button>
                    </div>
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
              <button onClick={() => appendRecipeIngredient(true)} className="quiet-action w-full p-4 text-sm font-black border-2 border-dashed border-transparent hover:border-slate-300">
                + Add Ingredient
                <span aria-hidden="true" className="quiet-action-line" />
              </button>
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
                      id={`recipe-instruction-${i}`}
                      value={step} 
                      onChange={e => { const n = [...instructions]; n[i] = e.target.value; setInstructions(n); }} 
                      onKeyDown={(e) => handleRecipeInstructionEnter(e, i)}
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
              <>
                <button onClick={() => appendRecipeInstruction(true)} className="quiet-action w-full p-4 text-sm font-black border-2 border-dashed border-transparent hover:border-slate-300">
                  + Add Step
                  <span aria-hidden="true" className="quiet-action-line" />
                </button>
                <p className="text-xs text-slate-500">Press Return to move to the next step. Use Shift+Return for a line break.</p>
              </>
            )}
          </div>
        </section>
        )}
      </div>

      {showPlanPicker && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-1">Add To Plan</h3>
            <p className="text-sm text-slate-600 mb-4 line-clamp-1">{title}</p>

            <select
              value={planDayIndex}
              onChange={(e) => setPlanDayIndex(parseInt(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 outline-none mb-4"
              style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
            >
              {WEEKDAY_OPTIONS.map((day, i) => (
                <option key={day} value={i}>{day}</option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={addToPlan}
                className="quiet-action flex-1 py-3 text-sm font-black"
              >
                Add
                <span aria-hidden="true" className="quiet-action-line" />
              </button>
              <button
                type="button"
                onClick={() => setShowPlanPicker(false)}
                className="quiet-action flex-1 py-3 text-sm font-bold"
              >
                Cancel
                <span aria-hidden="true" className="quiet-action-line" />
              </button>
            </div>
          </div>
        </div>
      )}
      <MobileNav />
    </main>
  );
}