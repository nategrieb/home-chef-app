-- Add canonical ingredient fields for normalized shopping list grouping.
ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS canonical_name TEXT,
  ADD COLUMN IF NOT EXISTS preparation_note TEXT;

-- Alias dictionary to improve deterministic normalization without an LLM.
CREATE TABLE IF NOT EXISTS public.ingredient_aliases (
  raw_term TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ingredient_aliases_canonical_name_idx
  ON public.ingredient_aliases (canonical_name);

-- Optional starter aliases (safe to rerun)
INSERT INTO public.ingredient_aliases (raw_term, canonical_name)
VALUES
  ('long-grain white rice', 'Rice'),
  ('white rice', 'Rice'),
  ('carrots', 'Carrot'),
  ('baby carrots', 'Carrot')
ON CONFLICT (raw_term) DO NOTHING;
