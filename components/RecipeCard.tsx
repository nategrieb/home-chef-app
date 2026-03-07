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

export default function RecipeCard({
  recipe,
  onAddToPlan,
}: {
  recipe: Recipe;
  onAddToPlan: (id: string) => void;
}) {
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
          <div className="ml-4 flex flex-col gap-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToPlan(recipe.id);
              }}
              className="quiet-action quiet-action-cta rounded-lg px-3 py-2 text-xs font-bold"
              aria-label="Add recipe to plan"
            >
              + Plan
              <span aria-hidden="true" className="quiet-action-line" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/submit-order?recipeId=${recipe.id}&autoload=1`;
              }}
              className="quiet-action quiet-action-cta rounded-lg px-3 py-2 text-xs font-bold"
              aria-label="Start order from recipe"
            >
              Order
              <span aria-hidden="true" className="quiet-action-line" />
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}