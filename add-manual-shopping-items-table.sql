-- Manual shopping items that are outside recipe ingredients.
-- These are intentionally separate from shopping_list_state so cleanup logic for recipe-based items will not remove them.

CREATE TABLE IF NOT EXISTS public.shopping_list_manual_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shopping_list_manual_items_created_at_idx
  ON public.shopping_list_manual_items (created_at DESC);
