-- ============================================================
-- THE MENU: remember how an entry was logged (2 x large egg, not just 100 g)
-- Run once in the Supabase SQL Editor, after add-calorie-tracking.sql.
-- Amounts are still stored in grams (food_log.grams); these two columns only keep the unit you used,
-- so the log reads "2 x large egg" and editing it later keeps counting eggs.
-- ============================================================

SET search_path TO chef;

ALTER TABLE food_log ADD COLUMN IF NOT EXISTS quantity      NUMERIC(8,2);   -- how many units, e.g. 2
ALTER TABLE food_log ADD COLUMN IF NOT EXISTS portion_label TEXT;           -- the unit, e.g. 'large egg'; NULL when logged by weight

NOTIFY pgrst, 'reload schema';
