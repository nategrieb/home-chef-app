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
  category?: string;
  total_time?: number;
  tags?: string[];
  dietary_preference?: string | string[];
  ingredients?: Ingredient[];
}

export default function RecipeCard({ recipe, onDelete }: { recipe: Recipe, onDelete: (id: string) => void }) {
  const dietaryPreferences = Array.isArray(recipe.dietary_preference)
    ? recipe.dietary_preference
    : recipe.dietary_preference
      ? [recipe.dietary_preference]
      : [];

  const dietEmoji: Record<string, string> = {
    Vegan: '🌱',
    Vegetarian: '🥕',
    'Gluten-Free': '🌾',
    Pescetarian: '🐟',
    'Dairy-Free': '🥛',
    'Nut-Free': '🥜',
    'Low-Carb': '🥖',
  };

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
              {dietaryPreferences.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  {dietaryPreferences.map((diet) => (
                    <span key={diet} className="font-medium">
                      {dietEmoji[diet]} {diet}
                    </span>
                  ))}
                </div>
              )}
              {recipe.total_time && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">⏱️ {recipe.total_time} mins</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {recipe.category && (
                <span className="inline-flex items-center gap-1 bg-[#004225] text-white px-2 py-1 rounded-full text-xs font-bold uppercase">
                  {recipe.category === 'Breakfast' && '🍳'} {recipe.category === 'Lunch' && '🥗'} {recipe.category === 'Dinner' && '🍽️'} {recipe.category === 'Snack' && '🍿'} {recipe.category}
                </span>
              )}
              {recipe.tags && recipe.tags.slice(0, 2).map((tag, index) => (
                <span key={index} className="bg-slate-200 text-slate-700 px-2 py-1 rounded-full text-xs font-medium">
                  {tag}
                </span>
              ))}
              {recipe.tags && recipe.tags.length > 2 && (
                <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded-full text-xs font-medium">
                  +{recipe.tags.length - 2} more
                </span>
              )}
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