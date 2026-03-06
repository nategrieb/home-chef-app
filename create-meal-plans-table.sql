-- Create the meal_plans table for the home chef app
-- Run this in your Supabase SQL Editor

CREATE TABLE meal_plans (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  planned_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(recipe_id, planned_date)
);

-- Create indexes for better performance
CREATE INDEX idx_meal_plans_planned_date ON meal_plans(planned_date);
CREATE INDEX idx_meal_plans_recipe_id ON meal_plans(recipe_id);

-- Enable Row Level Security (RLS)
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your auth setup)
CREATE POLICY "Enable all operations for authenticated users" ON meal_plans
  FOR ALL USING (true);