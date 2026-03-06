-- Update meal_plans table to use day_of_week instead of planned_date
-- Run this in your Supabase SQL Editor

-- First, backup existing data (if any)
CREATE TABLE meal_plans_backup AS SELECT * FROM meal_plans;

-- Drop the old table
DROP TABLE meal_plans;

-- Create new table with day_of_week
CREATE TABLE meal_plans (
  id SERIAL PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(recipe_id, day_of_week)
);

-- Create index for better performance
CREATE INDEX idx_meal_plans_day_of_week ON meal_plans(day_of_week);
CREATE INDEX idx_meal_plans_recipe_id ON meal_plans(recipe_id);

-- Enable Row Level Security
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Enable all operations for authenticated users" ON meal_plans
  FOR ALL USING (true);

-- Note: You'll need to manually migrate any existing data from meal_plans_backup
-- if you had important meal plans saved