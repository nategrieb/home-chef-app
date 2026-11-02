/**
 * One-time backfill: give every existing recipe nutrition, with no per-recipe clicking.
 *
 *   node --env-file=<service-key env> --env-file=.env.local \
 *     node_modules/.bin/tsx scripts/backfill-recipe-nutrition.ts [--apply] [--redo] [--only "title"] [--report file.md]
 *
 * Without --apply it only writes a report (nothing in the database changes). With --apply it
 *   - links each ingredient line to the food it matched (ingredients.food_id, and grams when not a guess), and
 *   - saves the recipe's nutrition, marked review = 'estimated' (all lines clear) or 'check' (something was unclear).
 * Servings come from the recipe's description ("Serves 4"); when it has none they are estimated from the weight.
 * Where a description lists the source's protein per serving, the result is compared against it.
 *
 * Needs add-recipe-nutrition.sql and add-recipe-ingredient-links.sql to have been run (for --apply).
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and USDA_API_KEY.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { createMatcher, type IngredientInput, type MatchedLine } from '../lib/recipe-match';
import { totalsOf, type RecipeItem } from '../lib/recipe-nutrition';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const apply = flag('--apply');
const redo = flag('--redo');
const only = option('--only')?.toLowerCase();
const reportPath = option('--report') ?? 'recipe-nutrition-backfill-report.md';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!process.env.USDA_API_KEY) console.warn('USDA_API_KEY is not set; falling back to the shared demo key (very slow).');

const supabase = createClient(url, key, { db: { schema: 'chef' }, auth: { autoRefreshToken: false, persistSession: false } });

type RecipeRow = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  ingredients: (IngredientInput & { id: string })[];
};

/** "Serves 4", "Serves 3-4", "Makes 2 bowls", "4 servings". */
function parseServings(description: string | null): number | null {
  const d = description ?? '';
  const m = d.match(/(?:serves?|makes?|yields?)\s*(?:about\s*)?(\d+(?:\.\d+)?)(?:\s*(?:to|-|–)\s*(\d+(?:\.\d+)?))?/i) ?? d.match(/(\d+)(?:\s*(?:to|-|–)\s*(\d+))?\s*servings?/i);
  if (!m) return null;
  const low = Number(m[1]);
  const high = m[2] ? Number(m[2]) : low;
  return (low + high) / 2;
}

/** "about 19 g protein" in a description: what the recipe's source says one serving has. */
function statedProtein(description: string | null): number | null {
  const m = (description ?? '').match(/about\s*(\d+(?:\.\d+)?)\s*g\s*protein/i);
  return m ? Number(m[1]) : null;
}

const SERVING_G: Record<string, number> = { Breakfast: 350, Lunch: 400, Dinner: 450, Snack: 150 };

async function main() {
  // Plain select first: the link columns only exist once the SQL has been run.
  let withLinks = true;
  const linkedSelect = 'id, title, category, description, ingredients(id, item_name, canonical_name, amount, unit, food_id, grams)';
  const plainSelect = 'id, title, category, description, ingredients(id, item_name, canonical_name, amount, unit)';
  let res: { data: unknown; error: { message: string } | null } = await supabase.from('recipes').select(linkedSelect).order('title');
  if (res.error) {
    withLinks = false;
    res = await supabase.from('recipes').select(plainSelect).order('title');
  }
  if (res.error) throw new Error(res.error.message);
  if (apply && !withLinks) {
    console.error('Run add-recipe-ingredient-links.sql first (the ingredients table has no food_id / grams columns yet).');
    process.exit(1);
  }

  let recipes = (res.data ?? []) as RecipeRow[];
  const existing = new Set(((await supabase.from('recipe_nutrition').select('recipe_id')).data ?? []).map((r) => r.recipe_id as string));
  if (!redo) recipes = recipes.filter((r) => !existing.has(r.id));
  if (only) recipes = recipes.filter((r) => r.title.toLowerCase().includes(only));

  console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ${recipes.length} recipes (${existing.size} already have nutrition${redo ? ', redoing them' : ', skipped'})\n`);

  const matcher = createMatcher(supabase as unknown as SupabaseClient);
  const lines: string[] = [];
  const stats = { recipes: 0, clear: 0, check: 0, lines: 0, linked: 0, flaggedLines: 0, skipped: 0, servingsFromText: 0, servingsGuessed: 0, proteinChecked: 0, proteinOff: 0 };

  for (const recipe of recipes) {
    const matched: MatchedLine[] = [];
    for (const ing of recipe.ingredients) matched.push(await matcher.match(ing)); // sequential: friendly to the USDA rate limit

    const items: RecipeItem[] = matched.filter((m) => m.food_id && m.grams > 0).map(({ confidence, reason, ...item }) => (void confidence, void reason, item));
    const totals = totalsOf(items);
    const parsedServings = parseServings(recipe.description);
    const servings = parsedServings ?? Math.min(8, Math.max(1, Math.round(totals.grams / (SERVING_G[recipe.category ?? ''] ?? 400))));
    // A line only counts as unclear when it matters: no food or no usable amount, or an estimated amount that is a
    // big part of the recipe's calories. (A rough tablespoon of chia seeds barely moves the total.)
    const lineKcal = (m: MatchedLine) => (m.per100.kcal * m.grams) / 100;
    const flagged = matched.filter((m) => m.confidence === 'check' && (m.reason !== 'amount estimated' || (totals.kcal > 0 && lineKcal(m) / totals.kcal > 0.15)));
    const perServing = { kcal: totals.kcal / servings, protein: totals.protein_g / servings };

    const stated = statedProtein(recipe.description);
    const problems: string[] = [];
    if (parsedServings == null) problems.push(`servings not stated, estimated as ${servings}`);
    if (stated != null) {
      stats.proteinChecked++;
      const off = Math.abs(perServing.protein - stated) / stated;
      if (off > 0.35) {
        problems.push(`protein per serving ${Math.round(perServing.protein)} g vs source's ${stated} g`);
        stats.proteinOff++;
      }
    }
    if (flagged.length > 0) problems.push(`${flagged.length} unclear line${flagged.length === 1 ? '' : 's'}`);
    const minor = matched.filter((m) => m.confidence === 'check' && !flagged.includes(m));
    const review: 'estimated' | 'check' = problems.length > 0 ? 'check' : 'estimated';

    stats.recipes++;
    stats.lines += matched.length;
    stats.linked += items.length;
    stats.flaggedLines += flagged.length;
    stats.skipped += matched.filter((m) => m.confidence === 'skipped').length;
    if (parsedServings != null) stats.servingsFromText++;
    else stats.servingsGuessed++;
    if (review === 'check') stats.check++;
    else stats.clear++;

    lines.push(`## ${recipe.title}`);
    lines.push(`- ${Math.round(perServing.kcal)} kcal and ${Math.round(perServing.protein)} g protein per serving, ${servings} servings${parsedServings == null ? ' (estimated)' : ''}, ${Math.round(totals.grams)} g total${stated != null ? `, source says ${stated} g protein` : ''}`);
    lines.push(`- ${review === 'check' ? '**CHECK**: ' + problems.join('; ') : 'looks fine'}`);
    for (const m of matched) {
      if (m.confidence === 'check' || m.confidence === 'skipped') {
        lines.push(`  - ${m.confidence === 'skipped' ? '·' : minor.includes(m) ? '~' : '⚠'} \`${m.line || m.name}\` → ${m.food_id ? `${m.name} (${m.grams} g)` : 'no food'}${m.reason ? ` — ${m.reason}` : ''}`);
      }
    }
    lines.push('');
    console.log(`${review === 'check' ? '⚠' : '✓'} ${recipe.title.slice(0, 52).padEnd(52)} ${String(Math.round(perServing.kcal)).padStart(4)} kcal/serv  ${String(servings).padStart(3)} serv${parsedServings == null ? '*' : ' '}  ${flagged.length} unclear`);

    if (apply) {
      const { error: nutritionError } = await supabase.from('recipe_nutrition').upsert(
        { recipe_id: recipe.id, servings, total_grams: totals.grams, kcal: totals.kcal, protein_g: totals.protein_g, carbs_g: totals.carbs_g, fat_g: totals.fat_g, items, review, updated_at: new Date().toISOString() },
        { onConflict: 'recipe_id' }
      );
      if (nutritionError) throw nutritionError;
      for (let i = 0; i < recipe.ingredients.length; i++) {
        const m = matched[i];
        if (!m.food_id) continue;
        const { error } = await supabase
          .from('ingredients')
          .update({ food_id: m.food_id, grams: m.guess ? null : m.grams })
          .eq('id', recipe.ingredients[i].id);
        if (error) throw error;
      }
    }
  }

  const summary = [
    `# Recipe nutrition backfill (${apply ? 'applied' : 'dry run'})`,
    '',
    `- Recipes: ${stats.recipes}. Look fine: ${stats.clear}. Marked to check: ${stats.check}.`,
    `- Ingredient lines: ${stats.lines}. Counted: ${stats.linked}. Unclear: ${stats.flaggedLines}. Seasonings with no amount (counted as zero): ${stats.skipped}.`,
    `- Servings read from the description: ${stats.servingsFromText}; estimated from weight: ${stats.servingsGuessed}.`,
    `- Protein compared with the source's stated figure: ${stats.proteinChecked}; more than 35% off: ${stats.proteinOff}.`,
    '',
  ];
  writeFileSync(reportPath, [...summary, ...lines].join('\n'));
  console.log('\n' + summary.slice(1).join('\n'));
  console.log(`Report: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
