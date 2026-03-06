-- Migration: Change dietary_preference to jsonb array for multi-select support
ALTER TABLE recipes
  ALTER COLUMN dietary_preference TYPE jsonb USING to_jsonb(dietary_preference);

-- Existing records are intentionally left unchanged for manual updates.
