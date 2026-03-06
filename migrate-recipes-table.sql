-- Migration: Ensure all required columns exist in recipes table for seeding
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ingredients TEXT[];
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS instructions TEXT[];
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS dietary_preference TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS total_time INTEGER;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Now you can safely run your seed inserts below this line.