// components/RecipeCard.tsx
interface Ingredient {
  calories: number;
}

interface Recipe {
  id: string;
  title: string;
  description?: string;
  servings?: number;
  ingredients?: Ingredient[];
}

export default function RecipeCard({ recipe, onDelete }: { recipe: Recipe, onDelete: (id: string) => void }) {
  // Calculate total calories from ingredients (we'll do this in the DB later, but for now...)
  const totalCals = recipe.ingredients?.reduce((acc: number, ing: Ingredient) => acc + (ing.calories || 0), 0);

  return (
    <div className="flex justify-between items-start py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group">
      <div className="flex-1">
        <h3 className="text-xl font-serif italic text-gray-900 group-hover:text-orange-700 transition-colors">
          {recipe.title}
        </h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-1 italic">
          {recipe.description || "A family favorite."}
        </p>
      </div>
      <div className="text-right ml-4 flex items-center gap-2">
        <span className="text-xs tracking-widest text-gray-400 font-bold uppercase">
          {totalCals > 0 ? `${totalCals} CAL` : '--- CAL'}
        </span>
        <p className="text-xs text-gray-400 uppercase tracking-tighter mt-1">
          {recipe.servings || 4} Servings
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete "${recipe.title}"?`)) {
              onDelete(recipe.id);
            }
          }}
          className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
        >
          ✕
        </button>
      </div>
    </div>
  );
}