// components/RecipeCard.tsx
export default function RecipeCard({ recipe }: { recipe: any }) {
  // Calculate total calories from ingredients (we'll do this in the DB later, but for now...)
  const totalCals = recipe.ingredients?.reduce((acc: number, ing: any) => acc + (ing.calories || 0), 0);

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
      <div className="text-right ml-4">
        <span className="text-xs tracking-widest text-gray-400 font-bold uppercase">
          {totalCals > 0 ? `${totalCals} CAL` : '--- CAL'}
        </span>
        <p className="text-xs text-gray-400 uppercase tracking-tighter mt-1">
          {recipe.servings || 4} Servings
        </p>
      </div>
    </div>
  );
}