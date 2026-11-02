-- ============================================================
-- THE MENU: link recipe ingredient lines to real foods
-- Run once in the Supabase SQL Editor, after add-recipe-nutrition.sql.
--
-- ingredients.food_id  the food this line is (from a scan, a search, or the one-time backfill)
-- ingredients.grams    how many grams the line is, when known (so nutrition does not depend on unit guessing)
-- recipe_nutrition.review  NULL = confirmed by a person; 'estimated' = filled in automatically from the
--                          ingredients; 'check' = filled in automatically but some lines were unclear
-- ============================================================

SET search_path TO chef;

ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS food_id UUID REFERENCES foods(id) ON DELETE SET NULL;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS grams   NUMERIC(9,2);
CREATE INDEX IF NOT EXISTS ingredients_food_id_idx ON ingredients (food_id) WHERE food_id IS NOT NULL;

ALTER TABLE recipe_nutrition ADD COLUMN IF NOT EXISTS review TEXT CHECK (review IN ('estimated', 'check'));

NOTIFY pgrst, 'reload schema';
