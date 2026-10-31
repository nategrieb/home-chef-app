-- ============================================================
-- THE MENU: nutrition for recipes, so a recipe can be logged in one or two taps
-- Run once in the Supabase SQL Editor, after add-calorie-tracking.sql.
--
-- One row per recipe. It holds the TOTALS for the whole recipe (kcal, protein, carbs, fat, weight in grams)
-- and how many servings it makes, plus the list of foods it was built from so it can be edited later.
-- Recipes are shared by the household, so everyone with access to the app can read and edit these rows;
-- each person's food log stays private.
-- ============================================================

SET search_path TO chef;

CREATE TABLE IF NOT EXISTS recipe_nutrition (
  recipe_id    UUID PRIMARY KEY REFERENCES recipes(id) ON DELETE CASCADE,
  servings     NUMERIC(6,2) NOT NULL DEFAULT 1 CHECK (servings > 0),
  total_grams  NUMERIC(9,2) NOT NULL CHECK (total_grams > 0),
  kcal         NUMERIC(9,2) NOT NULL DEFAULT 0,
  protein_g    NUMERIC(9,2) NOT NULL DEFAULT 0,
  carbs_g      NUMERIC(9,2) NOT NULL DEFAULT 0,
  fat_g        NUMERIC(9,2) NOT NULL DEFAULT 0,
  items        JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ "name": "...", "food_id": "...", "grams": 40, "kcal": 150, ... }]
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE recipe_nutrition ENABLE ROW LEVEL SECURITY;

CREATE POLICY recipe_nutrition_members ON recipe_nutrition FOR ALL TO authenticated
  USING (platform.has_app_access('chef'))
  WITH CHECK (platform.has_app_access('chef'));

REVOKE ALL ON recipe_nutrition FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON recipe_nutrition TO authenticated;
GRANT ALL ON recipe_nutrition TO service_role;

NOTIFY pgrst, 'reload schema';
