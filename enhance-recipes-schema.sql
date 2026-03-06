-- Add new fields to recipes table for enhanced filtering and search
-- Run this in your Supabase SQL Editor

-- Add category field (Breakfast, Lunch, Dinner, Snack)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('Breakfast', 'Lunch', 'Dinner', 'Snack'));

-- Add dietary_preference field (Vegan, Vegetarian, Gluten-Free, etc.)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS dietary_preference TEXT CHECK (dietary_preference IN ('Vegan', 'Vegetarian', 'Gluten-Free', 'Pescetarian', 'Dairy-Free', 'Nut-Free', 'Keto', 'Paleo', 'Low-Carb'));

-- Add total_time field (in minutes)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS total_time INTEGER;

-- Add tags field as JSON array for flexible tagging (Vegetarian, Gluten-Free, One-Pot, etc.)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_dietary_preference ON recipes(dietary_preference);
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_recipes_total_time ON recipes(total_time);