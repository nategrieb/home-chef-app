"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { supabase } from '../../lib/supabase';
import MobileNav from '../../components/MobileNav';

interface OrderIngredient {
  item_name: string;
  amount: string;
  unit: string;
}

interface RecipeSummary {
  id: string;
  title: string;
}

export default function SubmitOrderPage() {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [orderTitle, setOrderTitle] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [ingredients, setIngredients] = useState<OrderIngredient[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'info'; message: string } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [{ data: recipeList }, { data: currentOrder }] = await Promise.all([
        supabase.from('recipes').select('id, title').order('title'),
        supabase
          .from('current_orders')
          .select('recipe_id, order_title, order_notes, order_ingredients, order_instructions, updated_at')
          .eq('id', 'current')
          .maybeSingle(),
      ]);

      setRecipes((recipeList || []) as RecipeSummary[]);

      if (currentOrder) {
        setSelectedRecipeId(currentOrder.recipe_id || '');
        setOrderTitle(currentOrder.order_title || '');
        setOrderNotes(currentOrder.order_notes || '');
        setIngredients((currentOrder.order_ingredients as OrderIngredient[]) || []);
        setInstructions((currentOrder.order_instructions as string[]) || []);
        setLastUpdated(currentOrder.updated_at || '');
      }

      setLoading(false);
    }

    loadData();
  }, []);

  useEffect(() => {
    if (!showSuccess) return;
    const timer = window.setTimeout(() => setShowSuccess(false), 1700);
    return () => window.clearTimeout(timer);
  }, [showSuccess]);

  const selectedRecipeName = useMemo(
    () => recipes.find((r) => r.id === selectedRecipeId)?.title || 'No recipe selected',
    [recipes, selectedRecipeId]
  );

  const focusOrderIngredientName = (index: number) => {
    window.requestAnimationFrame(() => {
      const input = document.getElementById(`order-ingredient-name-${index}`) as HTMLInputElement | null;
      input?.focus();
    });
  };

  const appendOrderIngredient = (focusNewRow = false) => {
    let nextIndex = 0;
    setIngredients((prev) => {
      nextIndex = prev.length;
      return [...prev, { item_name: '', amount: '', unit: '' }];
    });

    if (focusNewRow) {
      window.setTimeout(() => focusOrderIngredientName(nextIndex), 0);
    }
  };

  const handleOrderIngredientEnter = (
    event: KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    if (index === ingredients.length - 1) {
      appendOrderIngredient(true);
      return;
    }

    focusOrderIngredientName(index + 1);
  };

  async function loadFromRecipe() {
    if (!selectedRecipeId) return;

    setLoadingRecipe(true);
    const [{ data: recipeData }, { data: ingredientData }] = await Promise.all([
      supabase
        .from('recipes')
        .select('title, description, instructions')
        .eq('id', selectedRecipeId)
        .single(),
      supabase
        .from('ingredients')
        .select('item_name, amount, unit')
        .eq('recipe_id', selectedRecipeId),
    ]);

    if (!recipeData) {
      setFeedback({ type: 'error', message: 'Could not load recipe details.' });
      setLoadingRecipe(false);
      return;
    }

    setOrderTitle(recipeData.title || '');
    setOrderNotes(recipeData.description || '');

    setIngredients(
      (ingredientData || []).map((row: { item_name: string; amount: number | null; unit: string | null }) => ({
        item_name: row.item_name || '',
        amount: row.amount == null ? '' : String(row.amount),
        unit: row.unit || '',
      }))
    );

    setInstructions(Array.isArray(recipeData.instructions) ? recipeData.instructions : []);
    setFeedback({ type: 'info', message: 'Recipe loaded. You can customize and submit.' });
    setLoadingRecipe(false);
  }

  async function submitOrder() {
    if (!orderTitle.trim()) {
      setFeedback({ type: 'error', message: 'Add an order title before submitting.' });
      return;
    }

    setSaving(true);
    const payload = {
      id: 'current',
      recipe_id: selectedRecipeId || null,
      order_title: orderTitle.trim(),
      order_notes: orderNotes.trim() || null,
      order_ingredients: ingredients,
      order_instructions: instructions,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('current_orders').upsert(payload, { onConflict: 'id' });

    setSaving(false);

    if (error) {
      setFeedback({ type: 'error', message: 'Could not submit order. Confirm `current_orders` exists.' });
      return;
    }

    setLastUpdated(payload.updated_at);
    setFeedback(null);
    setShowSuccess(true);
  }

  async function clearOrder() {
    const payload = {
      id: 'current',
      recipe_id: null,
      order_title: '',
      order_notes: null,
      order_ingredients: [],
      order_instructions: [],
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('current_orders').upsert(payload, { onConflict: 'id' });
    if (error) {
      setFeedback({ type: 'error', message: 'Could not reset order. Please try again.' });
      return;
    }

    setSelectedRecipeId('');
    setOrderTitle('');
    setOrderNotes('');
    setIngredients([]);
    setInstructions([]);
    setLastUpdated('');
    setShowClearConfirm(false);
    setFeedback({ type: 'info', message: 'Current order cleared.' });
  }

  if (loading) {
    return <div className="p-20 text-center text-slate-900 font-bold">Loading order workspace...</div>;
  }

  return (
    <main className="min-h-screen bg-white pb-40 px-6 pt-10">
      <header className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 leading-tight tracking-tighter">Submit Order</h1>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Build and save your current order</p>
      </header>

      <section className="bg-slate-100 rounded-3xl border border-slate-200 p-4 sm:p-6 mb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3">
          <select
            value={selectedRecipeId}
            onChange={(e) => setSelectedRecipeId(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="">Select a recipe to start from...</option>
            {recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadFromRecipe}
            disabled={!selectedRecipeId || loadingRecipe}
            className="bg-[#004225] text-white px-4 py-3 rounded-xl text-sm font-black uppercase tracking-wide disabled:bg-slate-300"
          >
            {loadingRecipe ? 'Loading...' : 'Load Recipe'}
          </button>
        </div>

        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Selected: {selectedRecipeName}
        </div>
      </section>

      <section className="bg-slate-50 rounded-3xl border border-slate-200 p-4 sm:p-6 space-y-4">
        {feedback && (
          <div
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              feedback.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <input
          value={orderTitle}
          onChange={(e) => setOrderTitle(e.target.value)}
          className="w-full bg-white border border-slate-300 p-3 rounded-xl font-bold text-black outline-none"
          placeholder="Order title"
          style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
        />

        <textarea
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          className="w-full bg-white border border-slate-300 p-3 rounded-xl text-black font-medium outline-none min-h-[90px]"
          placeholder="Order notes or custom requests"
          style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Ingredients</h2>
          </div>
          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_64px_64px_auto] sm:grid-cols-[minmax(0,1fr)_72px_72px_auto] gap-2 items-center">
                <input
                  id={`order-ingredient-name-${i}`}
                  value={ing.item_name}
                  placeholder="Ingredient"
                  onChange={(e) => {
                    const next = [...ingredients];
                    next[i].item_name = e.target.value;
                    setIngredients(next);
                  }}
                  onKeyDown={(e) => handleOrderIngredientEnter(e, i)}
                  className="w-full min-w-0 bg-white border border-slate-300 p-2.5 rounded-lg font-semibold text-black outline-none"
                  style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                />
                <input
                  value={ing.amount}
                  placeholder="Qty"
                  onChange={(e) => {
                    const next = [...ingredients];
                    next[i].amount = e.target.value;
                    setIngredients(next);
                  }}
                  onKeyDown={(e) => handleOrderIngredientEnter(e, i)}
                  className="w-full bg-white border border-slate-300 p-2.5 rounded-lg text-center font-semibold text-black outline-none"
                  style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                />
                <input
                  value={ing.unit}
                  placeholder="Unit"
                  onChange={(e) => {
                    const next = [...ingredients];
                    next[i].unit = e.target.value;
                    setIngredients(next);
                  }}
                  onKeyDown={(e) => handleOrderIngredientEnter(e, i)}
                  className="w-full bg-white border border-slate-300 p-2.5 rounded-lg text-center font-semibold text-black outline-none"
                  style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                />
                <button
                  type="button"
                  onClick={() => setIngredients((prev) => prev.filter((_, idx) => idx !== i))}
                  className="w-8 h-8 rounded-full bg-red-100 text-red-600 font-black"
                >
                  ×
                </button>
              </div>
            ))}
            {ingredients.length === 0 && (
              <p className="text-sm text-slate-500">No ingredients yet. Load a recipe or add manually.</p>
            )}
            <button
              type="button"
              onClick={() => appendOrderIngredient(true)}
              className="w-full bg-slate-100 text-[#004225] font-black text-sm uppercase p-3 rounded-xl border-2 border-dashed border-slate-300 hover:bg-slate-200 transition-colors"
            >
              + Add Ingredient
            </button>
            <p className="text-xs text-slate-500">Press Return in any ingredient field to jump to the next line.</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Instructions</h2>
            <button
              type="button"
              onClick={() => setInstructions((prev) => [...prev, ''])}
              className="text-xs font-black uppercase tracking-wide text-[#004225]"
            >
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {instructions.map((step, i) => (
              <div key={i} className="flex gap-2">
                <textarea
                  value={step}
                  onChange={(e) => {
                    const next = [...instructions];
                    next[i] = e.target.value;
                    setInstructions(next);
                  }}
                  rows={2}
                  className="flex-1 bg-white border border-slate-300 p-2.5 rounded-lg font-medium text-black outline-none"
                  style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                  placeholder={`Step ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => setInstructions((prev) => prev.filter((_, idx) => idx !== i))}
                  className="w-8 h-8 rounded-full bg-red-100 text-red-600 font-black shrink-0 mt-2"
                >
                  ×
                </button>
              </div>
            ))}
            {instructions.length === 0 && (
              <p className="text-sm text-slate-500">No instructions yet. Add custom prep steps.</p>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={submitOrder}
              disabled={saving}
              className="w-full bg-[#004225] text-white py-3.5 rounded-xl text-sm font-black uppercase tracking-wide disabled:bg-slate-300"
            >
              {saving ? 'Submitting...' : 'Submit Current Order'}
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="w-full sm:w-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wide"
            >
              Clear Active Order
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : 'No submitted order yet.'}
          </p>
        </div>
      </section>

      {showSuccess && (
        <div className="order-success-backdrop" aria-live="polite" role="status">
          <div className="order-success-card">
            <div className="order-success-pop">✓</div>
            <p className="text-xl font-black text-slate-900">Your order is in</p>
            <p className="text-sm text-slate-600 font-semibold">We saved it as your current order.</p>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[85] flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-red-200 p-6 shadow-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-600 mb-2">Confirm Clear</p>
            <h3 className="text-lg font-black text-slate-900 mb-2">Clear active order?</h3>
            <p className="text-sm text-slate-600 mb-4">
              This removes the current order from this page and from home.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl text-sm font-bold uppercase tracking-wide"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={clearOrder}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl text-sm font-black uppercase tracking-wide"
              >
                Yes, Clear It
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileNav />
    </main>
  );
}
