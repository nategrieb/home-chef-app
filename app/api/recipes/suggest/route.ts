import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabase-server';
import { searchFoods } from '../../../../lib/food-search';
import { loadPortionOptions } from '../../../../lib/food-portions';
import { ingredientGrams, type RecipeItem } from '../../../../lib/recipe-nutrition';
import type { Food } from '../../../../lib/nutrition';

type IngredientRow = {
  item_name: string;
  canonical_name: string | null;
  amount: number | string | null;
  unit: string | null;
};

// Ingredient lists name things the way they're bought: dry oats, raw chicken. So lean toward raw/dry entries, unless
// the recipe says "cooked".
const SEARCH_ALIASES: Record<string, string> = { berries: 'blueberries', 'mixed berries': 'blueberries' };
const rawness = (food: Food, line: string) => {
  const n = food.name.toLowerCase();
  if (/\bcooked\b/.test(line.toLowerCase())) return /\b(cooked|boiled)\b/.test(n) ? 3 : 0;
  return (/\b(raw|dry|uncooked)\b/.test(n) ? 3 : 0) - (/\b(cooked|boiled|prepared)\b/.test(n) ? 4 : 0);
};

const fmtAmount = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

/**
 * First draft of a recipe's nutrition: match each ingredient to a food and turn "1/2 cup" into grams using that
 * food's household measures. It is only a starting point; the builder shows every line for review.
 */
export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const recipeId = new URL(request.url).searchParams.get('recipeId');
  if (!recipeId) return NextResponse.json({ error: 'Missing recipeId' }, { status: 400 });

  const { data: rows, error } = await supabase
    .schema('chef')
    .from('ingredients')
    .select('item_name, canonical_name, amount, unit')
    .eq('recipe_id', recipeId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = await Promise.all(
    ((rows ?? []) as IngredientRow[]).map(async (ing): Promise<RecipeItem> => {
      const amount = Number(ing.amount ?? 0);
      const line = `${amount > 0 ? fmtAmount(amount) : ''}${ing.unit ? ` ${ing.unit}` : ''} ${ing.item_name}`.trim();
      const empty: RecipeItem = { name: ing.item_name, food_id: null, grams: 0, per100: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, line, guess: true };

      const term = ing.canonical_name || ing.item_name;
      const found = await searchFoods(supabase, SEARCH_ALIASES[term.toLowerCase()] ?? term, { includeBranded: false, limit: 12 });
      const food = [...found.foods].sort(
        (a, b) => rawness(b, line) - rawness(a, line) || found.foods.indexOf(a) - found.foods.indexOf(b)
      )[0];
      if (!food) return empty;

      const options = await loadPortionOptions(supabase, food.id);
      const converted = options ? ingredientGrams(amount, ing.unit, options.portions) : null;

      return {
        name: food.name,
        food_id: food.id,
        grams: converted ? Math.round(converted.grams * 10) / 10 : 0,
        per100: { kcal: food.kcal_100g, protein: food.protein_100g, carbs: food.carbs_100g, fat: food.fat_100g },
        line,
        guess: converted ? converted.guess : true,
      };
    })
  );

  return NextResponse.json({ items });
}
