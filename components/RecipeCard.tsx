// components/RecipeCard.tsx
import Link from 'next/link';

interface Ingredient {
  calories_per_unit: number;
}

interface Recipe {
  id: string;
  title: string;
  description?: string;
  servings?: number;
  serving_unit?: string;
  ingredients?: Ingredient[];
}

export default function RecipeCard({ recipe, onDelete }: { recipe: Recipe, onDelete: (id: string) => void }) {

  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <Link href={`/recipes/${recipe.id}`} className="block p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-medium text-slate-900 mb-2 group-hover:text-slate-700 transition-colors line-clamp-2">
              {recipe.title}
            </h3>
            <p className="text-sm text-slate-600 mb-4 line-clamp-2 leading-relaxed">
              {recipe.description || "A delicious recipe waiting to be discovered."}
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-medium">
                  Serves {recipe.servings || 4} {recipe.serving_unit || 'servings'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm(`Delete "${recipe.title}"?`)) {
                onDelete(recipe.id);
              }
            }}
            className="ml-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
            aria-label="Delete recipe"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </Link>
    </div>
  );
}