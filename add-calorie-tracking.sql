-- ============================================================
-- THE MENU: calorie tracking (phase 1)
-- Run in the Supabase SQL Editor. Safe to re-run.
-- Also add USDA_API_KEY (free, from fdc.nal.usda.gov) to .env.local and the Vercel project.
--
-- foods          shared catalogue + cache (USDA, later Open Food Facts) and each person's own custom foods.
--                Nutrients are per 100 g; `nutrients` keeps every nutrient the source gave us
--                (keyed by USDA nutrient number) so micronutrient goals can be added later without a migration.
-- food_log       one row per thing eaten, amount in GRAMS. A recipe can be logged by grams too
--                (recipe_id), so weighing a cooked dish works the same as weighing a food.
-- nutrition_goals one row per person (daily targets). Private to that person.
-- ============================================================

SET search_path TO chef;

CREATE TABLE IF NOT EXISTS foods (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source           TEXT NOT NULL CHECK (source IN ('usda', 'off', 'custom')),
  source_id        TEXT,                       -- USDA fdcId / barcode; NULL for custom foods
  barcode          TEXT,                       -- GTIN/UPC when known
  name             TEXT NOT NULL,
  brand            TEXT,
  owner_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,   -- NULL = shared catalogue, set = private custom food
  kcal_100g        NUMERIC(8,2) NOT NULL DEFAULT 0,
  protein_100g     NUMERIC(8,2) NOT NULL DEFAULT 0,
  carbs_100g       NUMERIC(8,2) NOT NULL DEFAULT 0,
  fat_100g         NUMERIC(8,2) NOT NULL DEFAULT 0,
  fiber_100g       NUMERIC(8,2),
  sugar_100g       NUMERIC(8,2),
  sodium_mg_100g   NUMERIC(10,2),
  nutrients        JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { "<nutrient number>": { "name": "...", "unit": "mg", "per100g": 1.2 } }
  serving_g        NUMERIC(8,2),               -- one labelled serving in grams (optional)
  serving_label    TEXT,                       -- e.g. "1 bar (68 g)"
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Not a partial index so upserts can target it; custom foods have a NULL source_id, and NULLs never collide.
CREATE UNIQUE INDEX IF NOT EXISTS foods_source_key ON foods (source, source_id);
CREATE INDEX IF NOT EXISTS foods_barcode_idx ON foods (barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS foods_name_lower_idx ON foods (lower(name));
CREATE INDEX IF NOT EXISTS foods_owner_idx ON foods (owner_id) WHERE owner_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS food_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_on   DATE NOT NULL,                   -- the person's local day
  meal        TEXT NOT NULL CHECK (meal IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_id     UUID REFERENCES foods(id) ON DELETE SET NULL,
  recipe_id   UUID REFERENCES recipes(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,                   -- display name kept even if the food/recipe is later removed
  grams       NUMERIC(8,2) NOT NULL CHECK (grams > 0),
  -- Totals for this entry, stored when logged so history doesn't shift if a food is edited later.
  kcal        NUMERIC(8,2) NOT NULL DEFAULT 0,
  protein_g   NUMERIC(8,2) NOT NULL DEFAULT 0,
  carbs_g     NUMERIC(8,2) NOT NULL DEFAULT 0,
  fat_g       NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (name <> '')
);

CREATE INDEX IF NOT EXISTS food_log_user_day_idx ON food_log (user_id, logged_on);
CREATE INDEX IF NOT EXISTS food_log_user_recent_idx ON food_log (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS nutrition_goals (
  user_id     UUID PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kcal        NUMERIC(8,2),
  protein_g   NUMERIC(8,2),
  carbs_g     NUMERIC(8,2),
  fat_g       NUMERIC(8,2),
  micro_goals JSONB NOT NULL DEFAULT '{}'::jsonb,   -- later: { "<nutrient number>": target }
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Row level security. Everything requires access to the "chef" app.
-- ------------------------------------------------------------
ALTER TABLE foods           ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;

-- Foods: everyone with app access reads the shared catalogue plus their own custom foods.
DROP POLICY IF EXISTS foods_select ON foods;
CREATE POLICY foods_select ON foods FOR SELECT TO authenticated
  USING (platform.has_app_access('chef') AND (owner_id IS NULL OR owner_id = auth.uid()));

-- Anyone with access may add to the shared catalogue (looked-up foods) or create their own custom food.
DROP POLICY IF EXISTS foods_insert ON foods;
CREATE POLICY foods_insert ON foods FOR INSERT TO authenticated
  WITH CHECK (
    platform.has_app_access('chef')
    AND (
      (source = 'custom' AND owner_id = auth.uid())
      OR (source <> 'custom' AND owner_id IS NULL)
    )
  );

-- Only your own custom foods can be edited or deleted. Catalogue rows are never changed by users.
DROP POLICY IF EXISTS foods_update_own ON foods;
CREATE POLICY foods_update_own ON foods FOR UPDATE TO authenticated
  USING (platform.has_app_access('chef') AND source = 'custom' AND owner_id = auth.uid())
  WITH CHECK (platform.has_app_access('chef') AND source = 'custom' AND owner_id = auth.uid());

DROP POLICY IF EXISTS foods_delete_own ON foods;
CREATE POLICY foods_delete_own ON foods FOR DELETE TO authenticated
  USING (platform.has_app_access('chef') AND source = 'custom' AND owner_id = auth.uid());

-- Food log and goals are private to each person.
DROP POLICY IF EXISTS food_log_own ON food_log;
CREATE POLICY food_log_own ON food_log FOR ALL TO authenticated
  USING (platform.has_app_access('chef') AND user_id = auth.uid())
  WITH CHECK (platform.has_app_access('chef') AND user_id = auth.uid());

DROP POLICY IF EXISTS nutrition_goals_own ON nutrition_goals;
CREATE POLICY nutrition_goals_own ON nutrition_goals FOR ALL TO authenticated
  USING (platform.has_app_access('chef') AND user_id = auth.uid())
  WITH CHECK (platform.has_app_access('chef') AND user_id = auth.uid());

-- Signed-out visitors get nothing; signed-in members get what the policies above allow.
REVOKE ALL ON foods, food_log, nutrition_goals FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON foods, food_log, nutrition_goals TO authenticated;
GRANT ALL ON foods, food_log, nutrition_goals TO service_role;
