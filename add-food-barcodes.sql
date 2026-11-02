-- ============================================================
-- THE MENU: your own barcode -> food links
-- Run once in the Supabase SQL Editor, after add-calorie-tracking.sql.
--
-- When a scan finds nothing (or reads a slightly different number each time), you can attach that barcode to a
-- food you already have. Each person has their own links; they are private, like the food log.
-- Price-coded store labels are saved as an item key such as "pe:250049", so every label for that item matches.
-- ============================================================

SET search_path TO chef;

CREATE TABLE IF NOT EXISTS food_barcodes (
  owner_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  barcode     TEXT NOT NULL,
  food_id     UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (owner_id, barcode)
);

ALTER TABLE food_barcodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY food_barcodes_own ON food_barcodes FOR ALL TO authenticated
  USING (platform.has_app_access('chef') AND owner_id = auth.uid())
  WITH CHECK (platform.has_app_access('chef') AND owner_id = auth.uid());

REVOKE ALL ON food_barcodes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON food_barcodes TO authenticated;
GRANT ALL ON food_barcodes TO service_role;

NOTIFY pgrst, 'reload schema';
