-- Backfill canonical_name and preparation_note from existing item_name.
-- Uses deterministic string parsing (no LLM).

UPDATE public.ingredients
SET
  canonical_name = CASE
    WHEN item_name IS NULL OR btrim(item_name) = '' THEN item_name
    ELSE initcap(
      btrim(
        split_part(
          regexp_replace(
            item_name,
            '^\s*(\d+\s+\d+/\d+|\d+/\d+|\d+(?:\.\d+)?)\s*(cups?|tablespoons?|tbsp|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|lb|grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|cans?|cloves?|bunch(?:es)?|pinch(?:es)?|dash(?:es)?|slices?|blocks?|stalks?)?\s*',
            '',
            'i'
          ),
          ',',
          1
        )
      )
    )
  END,
  preparation_note = NULLIF(
    btrim(
      CASE
        WHEN strpos(item_name, ',') > 0 THEN
          substr(item_name, strpos(item_name, ',') + 1)
        ELSE
          ''
      END
    ),
    ''
  )
WHERE canonical_name IS NULL OR btrim(canonical_name) = '';

-- Apply alias overrides if there is an exact raw-term match in item_name text.
UPDATE public.ingredients i
SET canonical_name = a.canonical_name
FROM public.ingredient_aliases a
WHERE lower(i.item_name) LIKE '%' || lower(a.raw_term) || '%';
