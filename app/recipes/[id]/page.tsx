"use client";
import { useEffect, useState, type KeyboardEvent } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import MobileNav from '../../../components/MobileNav';
import Header from '../../../components/Header';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | ''>('');
  const [dietaryPreference, setDietaryPreference] = useState<DietOption[]>([]);
  const [totalTime, setTotalTime] = useState<number | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [planDayIndex, setPlanDayIndex] = useState<number>((new Date().getDay() + 6) % 7);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [showUtilityMenu, setShowUtilityMenu] = useState(false);

  const hydrateForm = (data: any) => {
    setTitle(data.title || '');
    setDescription(data.description || '');
    setSourceUrl(data.source_url || '');
    setImageUrl(data.image_url || '');
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
    setImageLoadFailed(false);
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
        image_url: imageUrl.trim() || null,
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
    setShowUtilityMenu(false);
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

  const resolvedImageUrl = imageUrl.trim();
  const showRecipeImage = Boolean(resolvedImageUrl && !imageLoadFailed);
  const metaItems: string[] = [];
  if (typeof totalTime === 'number' && totalTime > 0) metaItems.push(`${totalTime} min`);
  if (category) metaItems.push(category);
  if (dietaryPreference.length) metaItems.push(`Dietary: ${dietaryPreference.join(', ')}`);

  const recipeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: title,
    description: description || undefined,
    recipeIngredient: ingredients
      .filter((ing) => ing.item_name?.trim())
      .map((ing) => [ing.amount, ing.unit, ing.item_name].filter(Boolean).join(' ')),
    recipeInstructions: instructions
      .filter(Boolean)
      .map((step, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        text: step,
      })),
  };

  return (
    <main className="min-h-screen bg-white pb-44">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeSchema) }}
      />
      <div className="sticky top-0 z-50 border-b border-slate-100 bg-white/85 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="quiet-action px-3 py-2 text-[11px] font-black"
            aria-label="Go back"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 18l-6-6 6-6" />
            </svg>
            <span className="sr-only">Back</span>
            <span aria-hidden="true" className="quiet-action-line" />
          </button>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUtilityMenu((current) => !current)}
                  className="quiet-action px-3 py-2 text-[11px] font-black"
                  aria-label="More options"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                  </svg>
                  <span className="sr-only">More</span>
                  <span aria-hidden="true" className="quiet-action-line" />
                </button>
                {showUtilityMenu && (
                  <div className="absolute right-0 top-full mt-2 w-44 rounded-none border border-slate-200 bg-white p-1.5">
                    <button
                      type="button"
                      onClick={startEditing}
                      className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                    >
                      Edit Recipe
                    </button>
                    <button
                      type="button"
                      onClick={deleteRecipeRecord}
                      className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-50"
                    >
                      Delete Recipe
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-8">
        <Header />

        {showRecipeImage ? (
          <div className="mb-6 overflow-hidden rounded-none border border-slate-200 bg-slate-100">
            <img
              src={resolvedImageUrl}
              alt={title || 'Recipe image'}
              className="h-[240px] w-full object-cover sm:h-[320px]"
              onError={() => setImageLoadFailed(true)}
            />
          </div>
        ) : (
          <div className="mb-6 flex h-[180px] items-end rounded-none border border-dashed border-slate-300 bg-[radial-gradient(circle_at_top_left,#fef3c7,transparent_38%),linear-gradient(135deg,#f8fafc_0%,#eff6ff_48%,#ecfccb_100%)] p-5 sm:h-[220px]">
            <div className="rounded-none bg-white/80 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Recipe Photo</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {isEditing ? 'Paste an image URL below to preview it here.' : 'Add an image URL to show a hero photo for this recipe.'}
              </p>
            </div>
          </div>
        )}

        <header className="mb-4">
          {isEditing ? (
            <input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full text-3xl font-black text-black border-2 border-[#004225] rounded-none p-3 bg-white outline-none"
              style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
            />
          ) : (
            <>
              <div className="flex items-start gap-2 sm:gap-3">
                <h1 className="page-title-brand text-4xl sm:text-5xl">{title}</h1>
                {sourceUrl && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex shrink-0 items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                    aria-label="Open source article"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span className="sr-only">Source Article</span>
                  </a>
                )}
              </div>
              <div className="mt-4 border-y border-slate-200 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {metaItems.map((item, index) => (
                    <span key={item} className="inline-flex items-center gap-2">
                      {index === 0 && (
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="9" strokeWidth={2} />
                          <path d="M12 7v5l3 2" strokeWidth={2} strokeLinecap="round" />
                        </svg>
                      )}
                      {index > 0 && <span aria-hidden="true">•</span>}
                      <span>{item}</span>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </header>

        {isEditing && (
          <div className="sticky top-4 z-40 mb-6 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-none p-3">
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

        {/* Info Section */}
        <section className={isEditing ? "bg-slate-50 rounded-none p-6 mb-8 border border-slate-200" : "mb-8"}>
          {isEditing ? (
            <div className="space-y-4">
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                className="w-full bg-white p-4 rounded-none text-black font-bold outline-none border-2 border-slate-300 min-h-[100px]" 
                style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                placeholder="Description"
              />
              <input 
                value={sourceUrl} 
                onChange={e => setSourceUrl(e.target.value)} 
                className="w-full bg-white p-4 rounded-none text-black font-bold text-sm outline-none border-2 border-slate-300" 
                style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                placeholder="Source URL"
              />
              <input
                value={imageUrl}
                onChange={e => {
                  setImageUrl(e.target.value);
                  setImageLoadFailed(false);
                }}
                className="w-full bg-white p-4 rounded-none text-black font-bold text-sm outline-none border-2 border-slate-300"
                style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                placeholder="Image URL"
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
                <div className="bg-white p-3 rounded-none border-2 border-slate-300 self-start">
                  <p className="text-xs uppercase tracking-wide text-slate-500 font-bold mb-2">Category</p>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full bg-white p-3 rounded-none text-black font-bold outline-none border-2 border-slate-300 min-h-[48px]"
                    style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="">Select Category</option>
                    <option value="Breakfast">🍳 Breakfast</option>
                    <option value="Lunch">🥗 Lunch</option>
                    <option value="Dinner">🍽️ Dinner</option>
                    <option value="Snack">🍿 Snack</option>
                  </select>
                </div>
                <div className="bg-white p-3 rounded-none border-2 border-slate-300 self-start">
                  <p className="text-xs uppercase tracking-wide text-slate-500 font-bold mb-2">Dietary Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {DIET_OPTIONS.map((diet) => {
                      const isSelected = dietaryPreference.includes(diet);
                      return (
                        <button
                          key={diet}
                          type="button"
                          onClick={() => toggleDiet(diet)}
                          className={`px-3 py-1 rounded-none text-[11px] sm:text-xs font-bold border transition-colors ${
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
                className="w-full bg-white p-4 rounded-none text-black font-bold outline-none border-2 border-slate-300"
                style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                placeholder="Total time (mins)"
                min="1"
              />
              <input
                value={tags.join(', ')}
                onChange={e => setTags(e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                className="w-full bg-white p-4 rounded-none text-black font-bold text-sm outline-none border-2 border-slate-300"
                style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                placeholder="Tags (comma separated: Vegetarian, Gluten-Free, One-Pot)"
              />
            </div>
          ) : (
            <>
              {/* Tags Area */}
              {tags && tags.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span key={index} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-none text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              {description && (
                <p className="text-slate-700 text-base sm:text-lg leading-relaxed mb-6" style={{ lineHeight: 1.6 }}>
                  {description}
                </p>
              )}

              {/* Balanced Action Row */}
              <div className="mb-12 flex items-stretch gap-3">
                <button
                  type="button"
                  onClick={openPlanPicker}
                  className="quiet-action quiet-action-brand flex-1 py-3 text-sm font-black tracking-[0.16em]"
                >
                  + PLAN
                  <span aria-hidden="true" className="quiet-action-line" />
                </button>
                <button
                  type="button"
                  onClick={() => { window.location.href = `/submit-order?recipeId=${params.id}&autoload=1`; }}
                  className="quiet-action quiet-action-brand flex-1 py-3 text-sm font-black tracking-[0.16em]"
                >
                  🛒 ORDER
                  <span aria-hidden="true" className="quiet-action-line" />
                </button>
              </div>
            </>
          )}
        </section>

        <div className="mb-8 border-t border-slate-100" />

        {/* Tab Selector */}
        <div className="relative mb-8 flex w-full rounded-none bg-slate-50 p-1">
          <span
            aria-hidden="true"
            className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-none bg-white shadow-sm transition-all duration-300 ease-out ${
              activeTab === 'ingredients' ? 'translate-x-0' : 'translate-x-full'
            }`}
          />
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`relative z-10 flex-1 py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
              activeTab === 'ingredients'
                ? 'text-[#004225]'
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            Ingredients
          </button>
          <button
            onClick={() => setActiveTab('instructions')}
            className={`relative z-10 flex-1 py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
              activeTab === 'instructions'
                ? 'text-[#004225]'
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            Instructions
          </button>
        </div>

        {/* Ingredients Section with Unit Input */}
        {activeTab === 'ingredients' && (
        <section className="mb-12">
          {isEditing && (
            <div className="mb-3 text-sm text-slate-500 font-medium">{ingredients.length} items</div>
          )}
          <div className="space-y-3">
            {ingredients.map((ing: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-none border border-slate-100">
                {isEditing ? (
                  <div className="grid gap-3 w-full">
                    <input 
                      id={`recipe-ingredient-name-${i}`}
                      value={ing.item_name} 
                      placeholder="Ingredient name"
                      onChange={e => { const n = [...ingredients]; n[i].item_name = e.target.value; setIngredients(n); }} 
                      onKeyDown={(e) => handleRecipeIngredientEnter(e, i)}
                      className="w-full bg-white border border-slate-300 p-3 rounded-none font-bold text-black outline-none min-w-0" 
                      style={{ color: '#000000', backgroundColor: '#FFFFFF' }} 
                    />
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 sm:grid-cols-[96px_1fr_auto] sm:max-w-sm">
                      <input 
                        value={ing.amount} 
                        placeholder="Qty"
                        onChange={e => { const n = [...ingredients]; n[i].amount = e.target.value; setIngredients(n); }} 
                        onKeyDown={(e) => handleRecipeIngredientEnter(e, i)}
                        className="w-full min-w-0 bg-white border border-slate-300 p-3 rounded-none text-center font-bold text-black outline-none" 
                        style={{ color: '#000000', backgroundColor: '#FFFFFF' }} 
                      />
                      <select
                        value={ing.unit || 'g'}
                        onChange={e => { const n = [...ingredients]; n[i].unit = e.target.value; setIngredients(n); }}
                        onKeyDown={(e) => handleRecipeIngredientEnter(e, i)}
                        className="w-full min-w-0 bg-white border border-slate-300 p-3 rounded-none text-center font-bold text-black outline-none"
                        style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                      >
                        {ing.unit && !UNIT_OPTIONS.includes(ing.unit) && <option value={ing.unit}>{ing.unit}</option>}
                        {UNIT_OPTIONS.map((unit) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                      <button onClick={() => setIngredients(ingredients.filter((_, idx) => idx !== i))} className="w-9 h-9 bg-red-100 text-red-600 rounded-none font-black text-sm hover:bg-red-200 transition-colors">×</button>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center gap-4 w-full cursor-pointer group">
                    <input type="checkbox" className="w-6 h-6 rounded-none border-2 border-slate-300 appearance-none checked:bg-[#004225] transition-all shrink-0" />
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
          <div className="space-y-6">
            {instructions.map((step: string, i: number) => (
              <div key={i} className="flex gap-4">
                <span className="w-8 h-8 rounded-none bg-[#004225] text-white flex items-center justify-center font-black text-sm shrink-0">{i + 1}</span>
                {isEditing ? (
                  <div className="w-full relative">
                    <textarea 
                      id={`recipe-instruction-${i}`}
                      value={step} 
                      onChange={e => { const n = [...instructions]; n[i] = e.target.value; setInstructions(n); }} 
                      onKeyDown={(e) => handleRecipeInstructionEnter(e, i)}
                      className="w-full bg-white p-4 rounded-none text-black font-bold outline-none border-2 border-slate-300 resize-none" 
                      style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                      rows={3}
                    />
                    <button onClick={() => setInstructions(instructions.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-none font-black text-xs">×</button>
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
          <div className="w-full max-w-md bg-white rounded-none sm:rounded-none border border-slate-200 p-6">
            <h3 className="text-lg font-black text-slate-900 mb-1">Add To Plan</h3>
            <p className="text-sm text-slate-600 mb-4 line-clamp-1">{title}</p>

            <select
              value={planDayIndex}
              onChange={(e) => setPlanDayIndex(parseInt(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded-none px-3 py-3 text-sm font-semibold text-slate-700 outline-none mb-4"
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