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
  const metaItems = [
    recipe.category,
    dietaryPreferences[0],
    recipe.total_time ? `${recipe.total_time} min` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="group bg-white rounded-none border border-slate-200 p-3 transition-colors duration-200 hover:border-slate-300">
      <div className="flex items-start gap-3">
        <Link href={`/recipes/${recipe.id}`} className="relative h-24 w-24 shrink-0 overflow-hidden bg-slate-100">
          {showThumbnail ? (
            <img
              src={recipe.image_url || ''}
              alt={recipe.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setImageLoadFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
              <span className="text-3xl opacity-25">🍴</span>
            </div>
          )}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <Link href={`/recipes/${recipe.id}`} className="min-w-0">
            <h3 className="text-[15px] font-black leading-snug text-slate-900 line-clamp-2 transition-colors group-hover:text-[#004225]">
              {recipe.title}
            </h3>
            {metaItems.length > 0 && (
              <p className="mt-1 text-[11px] font-semibold text-slate-400 line-clamp-1">
                {metaItems.join(' • ')}
              </p>
            )}
          </Link>

          <div className="mt-3 flex items-center gap-5">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToPlan(recipe.id);
              }}
              className="quiet-action quiet-action-brand !border-transparent !bg-transparent hover:!border-transparent hover:!bg-transparent focus-visible:!border-transparent focus-visible:!bg-transparent px-0 py-0 text-[11px] font-black tracking-[0.16em]"
              aria-label="Add recipe to plan"
            >
              + PLAN
              <span aria-hidden="true" className="quiet-action-line" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/submit-order?recipeId=${recipe.id}&autoload=1`;
              }}
              className="quiet-action quiet-action-brand !border-transparent !bg-transparent hover:!border-transparent hover:!bg-transparent focus-visible:!border-transparent focus-visible:!bg-transparent px-0 py-0 text-[11px] font-black tracking-[0.16em]"
              aria-label="Start order from recipe"
            >
              🛒 ORDER
              <span aria-hidden="true" className="quiet-action-line" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}