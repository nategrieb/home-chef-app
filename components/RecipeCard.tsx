// components/RecipeCard.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Ingredient {
  calories_per_unit: number;
}

interface Recipe {
  id: string;
  title: string;
  description?: string;
  image_url?: string | null;
  servings?: number;
  serving_unit?: string;
  category?: string;
  total_time?: number;
  tags?: string[];
  dietary_preference?: string | string[];
  ingredients?: Ingredient[];
}

const CATEGORY_ICON: Record<string, string> = {
  Breakfast: '🍳',
  Lunch: '🥗',
  Dinner: '🍽️',
  Snack: '🍿',
};

const DIET_EMOJI: Record<string, string> = {
  Vegan: '🌱',
  Vegetarian: '🥕',
  'Gluten-Free': '🌾',
  Pescetarian: '🐟',
  'Dairy-Free': '🥛',
  'Nut-Free': '🥜',
  'Low-Carb': '🥖',
};

export default function RecipeCard({
  recipe,
  onAddToPlan,
}: {
  recipe: Recipe;
  onAddToPlan: (id: string) => void;
}) {
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  useEffect(() => {
    setImageLoadFailed(false);
  }, [recipe.image_url]);

  const dietaryPreferences = Array.isArray(recipe.dietary_preference)
    ? recipe.dietary_preference
    : recipe.dietary_preference
      ? [recipe.dietary_preference]
      : [];

  const showThumbnail = Boolean(recipe.image_url && !imageLoadFailed);

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-slate-300 active:scale-[0.995]">

      {/* ── Main tap target ────────────────────────────────────── */}
      <Link href={`/recipes/${recipe.id}`} className="flex h-[96px] overflow-hidden">

        {/* Thumbnail — flush left, full card height */}
        <div className="relative w-[96px] shrink-0 self-stretch overflow-hidden bg-slate-100">
          {showThumbnail ? (
            <img
              src={recipe.image_url || ''}
              alt={recipe.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageLoadFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
              <span className="text-3xl opacity-25">🍴</span>
            </div>
          )}
          {/* Subtle right-edge fade so text doesn't clash */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-3 bg-gradient-to-r from-transparent to-white/20" />
        </div>

        {/* Info block */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-3 py-3">

          {/* Title */}
          <h3 className="text-[15px] font-black leading-snug text-slate-900 line-clamp-2 transition-colors group-hover:text-[#004225]">
            {recipe.title}
          </h3>

          {/* Primary meta: category pill + diet labels + time */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {recipe.category && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#004225] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                {CATEGORY_ICON[recipe.category]} {recipe.category}
              </span>
            )}
            {dietaryPreferences.slice(0, 2).map((diet) => (
              <span key={diet} className="text-[11px] font-semibold text-slate-500">
                {DIET_EMOJI[diet]} {diet}
              </span>
            ))}
            {recipe.total_time && (
              <span className="ml-auto text-[11px] font-semibold text-slate-400 tabular-nums">
                {recipe.total_time} min
              </span>
            )}
          </div>

          {/* Secondary meta: tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {recipe.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
                >
                  {tag}
                </span>
              ))}
              {recipe.tags.length > 3 && (
                <span className="text-[10px] font-medium text-slate-400">
                  +{recipe.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* ── Action bar ─────────────────────────────────────────── */}
      <div className="flex border-t border-slate-100">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddToPlan(recipe.id);
          }}
          className="quiet-action flex-1 py-2.5 text-[11px] font-black tracking-[0.16em]"
          aria-label="Add recipe to plan"
        >
          + Plan
          <span aria-hidden="true" className="quiet-action-line" />
        </button>
        <div className="w-px shrink-0 bg-slate-100" />
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = `/submit-order?recipeId=${recipe.id}&autoload=1`;
          }}
          className="quiet-action flex-1 py-2.5 text-[11px] font-black tracking-[0.16em]"
          aria-label="Start order from recipe"
        >
          Order
          <span aria-hidden="true" className="quiet-action-line" />
        </button>
      </div>
    </div>
  );
}