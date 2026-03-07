"use client";

import { useEffect, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import MobileNav from '../../components/MobileNav';

interface OrderIngredient {
  item_name: string;
  amount: string;
  unit: string;
}

const LEGACY_ADDITIONAL_COMMENTS_SEPARATOR = '\n\n---\nAdditional Comments:\n';

function normalizeLegacyOrderNotes(rawNotes: string | null | undefined) {
  if (!rawNotes) return '';
  return rawNotes.split(LEGACY_ADDITIONAL_COMMENTS_SEPARATOR).filter(Boolean).join('\n\n');
}

export default function SubmitOrderPage() {
  const router = useRouter();
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [orderTitle, setOrderTitle] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [ingredients, setIngredients] = useState<OrderIngredient[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'info'; message: string } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');
  const [queryRecipeHandled, setQueryRecipeHandled] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: currentOrder } = await supabase
        .from('current_orders')
        .select('recipe_id, order_title, order_notes, order_ingredients, order_instructions, updated_at')
        .eq('id', 'current')
        .maybeSingle();

      if (currentOrder) {
        setSelectedRecipeId(currentOrder.recipe_id || '');
        setOrderTitle(currentOrder.order_title || '');
        setOrderNotes(normalizeLegacyOrderNotes(currentOrder.order_notes || ''));
        setIngredients((currentOrder.order_ingredients as OrderIngredient[]) || []);
        setInstructions((currentOrder.order_instructions as string[]) || []);
        setLastUpdated(currentOrder.updated_at || '');

        if (currentOrder.recipe_id) {
          const { data: sourceRecipe } = await supabase
            .from('recipes')
            .select('description')
            .eq('id', currentOrder.recipe_id)
            .maybeSingle();

          setRecipeDescription(sourceRecipe?.description || '');
        }
      }

      setLoading(false);
    }

    loadData();
  }, []);

  useEffect(() => {
    if (!showSuccess) return;
    const timer = window.setTimeout(() => {
      setShowSuccess(false);
      router.push('/');
    }, 2300);
    return () => window.clearTimeout(timer);
  }, [showSuccess, router]);

  const hasSubmittedOrder = Boolean(lastUpdated);

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

  const focusOrderInstruction = (index: number) => {
    window.requestAnimationFrame(() => {
      const input = document.getElementById(`order-instruction-${index}`) as HTMLTextAreaElement | null;
      input?.focus();
    });
  };

  const appendOrderInstruction = (focusNewRow = false) => {
    let nextIndex = 0;
    setInstructions((prev) => {
      nextIndex = prev.length;
      return [...prev, ''];
    });

    if (focusNewRow) {
      window.setTimeout(() => focusOrderInstruction(nextIndex), 0);
    }
  };

  const handleOrderInstructionEnter = (
    event: KeyboardEvent<HTMLTextAreaElement>,
    index: number
  ) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();

    if (index === instructions.length - 1) {
      appendOrderInstruction(true);
      return;
    }

    focusOrderInstruction(index + 1);
  };

  async function loadRecipeById(recipeId: string) {
    if (!recipeId) return;

    const [{ data: recipeData }, { data: ingredientData }] = await Promise.all([
      supabase
        .from('recipes')
        .select('title, description, instructions')
        .eq('id', recipeId)
        .single(),
      supabase
        .from('ingredients')
        .select('item_name, amount, unit')
        .eq('recipe_id', recipeId),
    ]);

    if (!recipeData) {
      setFeedback({ type: 'error', message: 'Could not load recipe details.' });
      return;
    }

    setSelectedRecipeId(recipeId);
    setOrderTitle(recipeData.title || '');
    setRecipeDescription(recipeData.description || '');
    setOrderNotes('');

    setIngredients(
      (ingredientData || []).map((row: { item_name: string; amount: number | null; unit: string | null }) => ({
        item_name: row.item_name || '',
        amount: row.amount == null ? '' : String(row.amount),
        unit: row.unit || '',
      }))
    );

    setInstructions(Array.isArray(recipeData.instructions) ? recipeData.instructions : []);
    setFeedback({ type: 'info', message: 'Recipe loaded. You can customize and submit.' });
  }

  useEffect(() => {
    if (loading || queryRecipeHandled) return;

    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get('recipeId');
    const autoload = params.get('autoload') === '1';

    if (recipeId) {
      setSelectedRecipeId(recipeId);
      if (autoload) {
        void loadRecipeById(recipeId);
      }
      setQueryRecipeHandled(true);
      return;
    }

    setQueryRecipeHandled(true);
  }, [loading, queryRecipeHandled]);

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
    setRecipeDescription('');
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

  const submitLabel = saving ? 'Submitting...' : 'Submit Current Order';
  const orderStatusCard = (
    <div className="pt-3 border-t border-slate-200 bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Order Status</p>
          <p className="text-sm text-slate-600 font-medium">
            {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : 'No submitted order yet.'}
          </p>
          <p className="text-xs text-slate-500 mt-2">Submit anytime to update your current order.</p>
        </div>
        {hasSubmittedOrder && (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="shrink-0 rounded-lg border border-red-200 bg-white px-2.5 py-2 text-[11px] sm:text-xs font-black uppercase tracking-wide text-red-700 hover:bg-red-50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-white pb-44 px-4 sm:px-6 pt-8 sm:pt-10">
      <div className="max-w-3xl mx-auto">
      <header className="mb-8">
        <p className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-[0.2em] mb-3 shadow-sm">
          Current Order
        </p>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 leading-tight tracking-tighter">Submit Order</h1>
        <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-2xl">Build your active order, customize details, and submit updates for the kitchen.</p>
      </header>

      {!hasSubmittedOrder && (
        <div className="mb-6">
          <button
            type="button"
            onClick={submitOrder}
            disabled={saving}
            className="w-full bg-[#004225] text-white py-3.5 rounded-xl text-sm font-black uppercase tracking-wide disabled:bg-slate-300 shadow-sm hover:bg-[#00351d] transition-colors"
          >
            {submitLabel}
          </button>
        </div>
      )}

      {hasSubmittedOrder && <div className="mb-6">{orderStatusCard}</div>}

      <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-6">
        <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-700">Order Details</h2>
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

        {recipeDescription.trim() && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Recipe Description</p>
            <p className="text-sm text-slate-700 font-medium whitespace-pre-line">{recipeDescription}</p>
          </div>
        )}

        <input
          value={orderTitle}
          onChange={(e) => setOrderTitle(e.target.value)}
          className="w-full bg-white border border-slate-300 p-3 rounded-xl font-bold text-black outline-none focus:ring-2 focus:ring-[#004225]/30 focus:border-[#004225]"
          placeholder="Order title"
          style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
        />

        <textarea
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          className="w-full bg-white border border-slate-300 p-3 rounded-xl text-black font-medium outline-none min-h-[90px] focus:ring-2 focus:ring-[#004225]/30 focus:border-[#004225]"
          placeholder="Order notes and customization requests"
          style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
        />

        <div className="flex bg-slate-100 rounded-2xl p-1 border border-slate-200">
          <button
            type="button"
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
            type="button"
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

        {activeTab === 'ingredients' && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4">
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
                  className="w-full min-w-0 bg-white border border-slate-300 p-2.5 rounded-lg font-semibold text-black outline-none focus:ring-2 focus:ring-[#004225]/25 focus:border-[#004225]"
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
                  className="w-full bg-white border border-slate-300 p-2.5 rounded-lg text-center font-semibold text-black outline-none focus:ring-2 focus:ring-[#004225]/25 focus:border-[#004225]"
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
                  className="w-full bg-white border border-slate-300 p-2.5 rounded-lg text-center font-semibold text-black outline-none focus:ring-2 focus:ring-[#004225]/25 focus:border-[#004225]"
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
              <p className="text-sm text-slate-500">No ingredients yet. Add them manually or from a recipe card.</p>
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
        )}

        {activeTab === 'instructions' && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Instructions</h2>
          </div>
          <div className="space-y-2">
            {instructions.map((step, i) => (
              <div key={i} className="flex gap-2">
                <textarea
                  id={`order-instruction-${i}`}
                  value={step}
                  onChange={(e) => {
                    const next = [...instructions];
                    next[i] = e.target.value;
                    setInstructions(next);
                  }}
                  onKeyDown={(e) => handleOrderInstructionEnter(e, i)}
                  rows={2}
                  className="flex-1 bg-white border border-slate-300 p-2.5 rounded-lg font-medium text-black outline-none focus:ring-2 focus:ring-[#004225]/25 focus:border-[#004225]"
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
            <button
              type="button"
              onClick={() => appendOrderInstruction(true)}
              className="w-full bg-slate-100 text-[#004225] font-black text-sm uppercase p-3 rounded-xl border-2 border-dashed border-slate-300 hover:bg-slate-200 transition-colors"
            >
              + Add Step
            </button>
            <p className="text-xs text-slate-500">Press Return to move to the next step. Use Shift+Return for a line break.</p>
          </div>
        </div>
        )}

        {!hasSubmittedOrder && orderStatusCard}

        <button
          type="button"
          onClick={submitOrder}
          disabled={saving}
          className="w-full bg-[#004225] text-white py-3.5 rounded-xl text-sm font-black uppercase tracking-wide disabled:bg-slate-300 shadow-sm hover:bg-[#00351d] transition-colors"
        >
          {submitLabel}
        </button>
      </section>

      {showSuccess && (
        <div className="order-success-backdrop" aria-live="polite" role="status">
          <div className="order-success-burst" aria-hidden="true" />
          <div className="order-success-card">
            <div className="order-success-pop">✓</div>
            <p className="text-xl font-black text-slate-900">Your order is in</p>
            <p className="text-sm text-slate-700 font-semibold">Saved as your current order.</p>
            <p className="order-success-sub">Returning to menu...</p>
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
      </div>
    </main>
  );
}
