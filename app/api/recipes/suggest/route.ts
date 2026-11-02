import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabase-server';
import { createMatcher, type IngredientInput } from '../../../../lib/recipe-match';
import type { RecipeItem } from '../../../../lib/recipe-nutrition';

/**
 * First draft of a recipe's nutrition: each ingredient line matched to a food (or the food it is already linked to)
 * with its amount turned into grams. It is only a starting point; the builder shows every line for review.
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
    .select('item_name, canonical_name, amount, unit, food_id, grams')
    .eq('recipe_id', recipeId);
  if (error) {
    // The link columns come from add-recipe-ingredient-links.sql; fall back to plain lines until it has been run.
    const plain = await supabase.schema('chef').from('ingredients').select('item_name, canonical_name, amount, unit').eq('recipe_id', recipeId);
    if (plain.error) return NextResponse.json({ error: plain.error.message }, { status: 500 });
    return respond((plain.data ?? []) as IngredientInput[], supabase);
  }
  return respond((rows ?? []) as IngredientInput[], supabase);
}

async function respond(lines: IngredientInput[], supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
  const matcher = createMatcher(supabase);
  const items: RecipeItem[] = await Promise.all(
    lines.map(async (line) => {
      const { confidence, reason, ...item } = await matcher.match(line);
      void confidence;
      void reason;
      return item;
    })
  );
  return NextResponse.json({ items });
}
