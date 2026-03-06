-- Backfill ingredients table from recipes.ingredients
-- Safe to run multiple times: only inserts for recipes that currently have no ingredient rows.

DO $$
DECLARE
  ingredients_udt text;
BEGIN
  SELECT c.udt_name
  INTO ingredients_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'recipes'
    AND c.column_name = 'ingredients';

  IF ingredients_udt IS NULL THEN
    RAISE EXCEPTION 'Column public.recipes.ingredients does not exist';
  END IF;

  IF ingredients_udt = 'jsonb' THEN
    INSERT INTO public.ingredients (recipe_id, item_name, canonical_name, preparation_note, amount, unit, calories_per_unit)
    SELECT
      s.recipe_id,
      CASE
        WHEN s.match_parts IS NULL OR s.match_parts[3] IS NULL OR btrim(s.match_parts[3]) = '' THEN s.raw_item_name
        ELSE btrim(s.match_parts[3])
      END AS item_name,
      CASE
        WHEN s.match_parts IS NULL OR s.match_parts[3] IS NULL OR btrim(s.match_parts[3]) = '' THEN initcap(s.raw_item_name)
        ELSE initcap(btrim(s.match_parts[3]))
      END AS canonical_name,
      NULL::text AS preparation_note,
      CASE
        WHEN s.match_parts IS NULL THEN 1
        WHEN s.match_parts[1] ~ '^\d+\s+\d+/\d+$' THEN
          split_part(s.match_parts[1], ' ', 1)::numeric
          + split_part(split_part(s.match_parts[1], ' ', 2), '/', 1)::numeric
            / NULLIF(split_part(split_part(s.match_parts[1], ' ', 2), '/', 2)::numeric, 0)
        WHEN s.match_parts[1] ~ '^\d+/\d+$' THEN
          split_part(s.match_parts[1], '/', 1)::numeric
          / NULLIF(split_part(s.match_parts[1], '/', 2)::numeric, 0)
        ELSE COALESCE(s.match_parts[1]::numeric, 1)
      END AS amount,
      CASE
        WHEN s.match_parts IS NULL OR s.match_parts[2] IS NULL OR btrim(s.match_parts[2]) = '' THEN 'item'
        ELSE CASE lower(s.match_parts[2])
          WHEN 'cups' THEN 'cup'
          WHEN 'tablespoon' THEN 'tbsp'
          WHEN 'tablespoons' THEN 'tbsp'
          WHEN 'tbsp' THEN 'tbsp'
          WHEN 'teaspoon' THEN 'tsp'
          WHEN 'teaspoons' THEN 'tsp'
          WHEN 'tsp' THEN 'tsp'
          WHEN 'ounces' THEN 'oz'
          WHEN 'ounce' THEN 'oz'
          WHEN 'oz' THEN 'oz'
          WHEN 'pounds' THEN 'lb'
          WHEN 'pound' THEN 'lb'
          WHEN 'lbs' THEN 'lb'
          WHEN 'lb' THEN 'lb'
          WHEN 'grams' THEN 'g'
          WHEN 'gram' THEN 'g'
          WHEN 'g' THEN 'g'
          WHEN 'kilograms' THEN 'kg'
          WHEN 'kilogram' THEN 'kg'
          WHEN 'kg' THEN 'kg'
          WHEN 'milliliters' THEN 'ml'
          WHEN 'milliliter' THEN 'ml'
          WHEN 'ml' THEN 'ml'
          WHEN 'liters' THEN 'l'
          WHEN 'liter' THEN 'l'
          WHEN 'l' THEN 'l'
          WHEN 'cans' THEN 'can'
          WHEN 'can' THEN 'can'
          WHEN 'cloves' THEN 'clove'
          WHEN 'clove' THEN 'clove'
          WHEN 'bunches' THEN 'bunch'
          WHEN 'bunch' THEN 'bunch'
          WHEN 'pinches' THEN 'pinch'
          WHEN 'pinch' THEN 'pinch'
          WHEN 'dashes' THEN 'dash'
          WHEN 'dash' THEN 'dash'
          WHEN 'slices' THEN 'slice'
          WHEN 'slice' THEN 'slice'
          WHEN 'blocks' THEN 'block'
          WHEN 'block' THEN 'block'
          WHEN 'stalks' THEN 'stalk'
          WHEN 'stalk' THEN 'stalk'
          ELSE lower(s.match_parts[2])
        END
      END AS unit,
      0 AS calories_per_unit
    FROM (
      SELECT
        r.id AS recipe_id,
        trim(v.item) AS raw_item_name,
        regexp_match(
          trim(v.item),
          '^\s*(\d+\s+\d+/\d+|\d+/\d+|\d+(?:\.\d+)?)\s*(cups?|tablespoons?|tbsp|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|lb|grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|cans?|cloves?|bunch(?:es)?|pinch(?:es)?|dash(?:es)?|slices?|blocks?|stalks?)?\s*(.*)$',
          'i'
        ) AS match_parts
      FROM public.recipes r
      CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(r.ingredients, '[]'::jsonb)) AS v(item)
      WHERE trim(v.item) <> ''
        AND NOT EXISTS (
          SELECT 1
          FROM public.ingredients i
          WHERE i.recipe_id = r.id
        )
    ) s;

  ELSIF ingredients_udt = '_text' THEN
    INSERT INTO public.ingredients (recipe_id, item_name, canonical_name, preparation_note, amount, unit, calories_per_unit)
    SELECT
      s.recipe_id,
      CASE
        WHEN s.match_parts IS NULL OR s.match_parts[3] IS NULL OR btrim(s.match_parts[3]) = '' THEN s.raw_item_name
        ELSE btrim(s.match_parts[3])
      END AS item_name,
      CASE
        WHEN s.match_parts IS NULL OR s.match_parts[3] IS NULL OR btrim(s.match_parts[3]) = '' THEN initcap(s.raw_item_name)
        ELSE initcap(btrim(s.match_parts[3]))
      END AS canonical_name,
      NULL::text AS preparation_note,
      CASE
        WHEN s.match_parts IS NULL THEN 1
        WHEN s.match_parts[1] ~ '^\d+\s+\d+/\d+$' THEN
          split_part(s.match_parts[1], ' ', 1)::numeric
          + split_part(split_part(s.match_parts[1], ' ', 2), '/', 1)::numeric
            / NULLIF(split_part(split_part(s.match_parts[1], ' ', 2), '/', 2)::numeric, 0)
        WHEN s.match_parts[1] ~ '^\d+/\d+$' THEN
          split_part(s.match_parts[1], '/', 1)::numeric
          / NULLIF(split_part(s.match_parts[1], '/', 2)::numeric, 0)
        ELSE COALESCE(s.match_parts[1]::numeric, 1)
      END AS amount,
      CASE
        WHEN s.match_parts IS NULL OR s.match_parts[2] IS NULL OR btrim(s.match_parts[2]) = '' THEN 'item'
        ELSE CASE lower(s.match_parts[2])
          WHEN 'cups' THEN 'cup'
          WHEN 'tablespoon' THEN 'tbsp'
          WHEN 'tablespoons' THEN 'tbsp'
          WHEN 'tbsp' THEN 'tbsp'
          WHEN 'teaspoon' THEN 'tsp'
          WHEN 'teaspoons' THEN 'tsp'
          WHEN 'tsp' THEN 'tsp'
          WHEN 'ounces' THEN 'oz'
          WHEN 'ounce' THEN 'oz'
          WHEN 'oz' THEN 'oz'
          WHEN 'pounds' THEN 'lb'
          WHEN 'pound' THEN 'lb'
          WHEN 'lbs' THEN 'lb'
          WHEN 'lb' THEN 'lb'
          WHEN 'grams' THEN 'g'
          WHEN 'gram' THEN 'g'
          WHEN 'g' THEN 'g'
          WHEN 'kilograms' THEN 'kg'
          WHEN 'kilogram' THEN 'kg'
          WHEN 'kg' THEN 'kg'
          WHEN 'milliliters' THEN 'ml'
          WHEN 'milliliter' THEN 'ml'
          WHEN 'ml' THEN 'ml'
          WHEN 'liters' THEN 'l'
          WHEN 'liter' THEN 'l'
          WHEN 'l' THEN 'l'
          WHEN 'cans' THEN 'can'
          WHEN 'can' THEN 'can'
          WHEN 'cloves' THEN 'clove'
          WHEN 'clove' THEN 'clove'
          WHEN 'bunches' THEN 'bunch'
          WHEN 'bunch' THEN 'bunch'
          WHEN 'pinches' THEN 'pinch'
          WHEN 'pinch' THEN 'pinch'
          WHEN 'dashes' THEN 'dash'
          WHEN 'dash' THEN 'dash'
          WHEN 'slices' THEN 'slice'
          WHEN 'slice' THEN 'slice'
          WHEN 'blocks' THEN 'block'
          WHEN 'block' THEN 'block'
          WHEN 'stalks' THEN 'stalk'
          WHEN 'stalk' THEN 'stalk'
          ELSE lower(s.match_parts[2])
        END
      END AS unit,
      0 AS calories_per_unit
    FROM (
      SELECT
        r.id AS recipe_id,
        trim(v.item) AS raw_item_name,
        regexp_match(
          trim(v.item),
          '^\s*(\d+\s+\d+/\d+|\d+/\d+|\d+(?:\.\d+)?)\s*(cups?|tablespoons?|tbsp|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|lb|grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|cans?|cloves?|bunch(?:es)?|pinch(?:es)?|dash(?:es)?|slices?|blocks?|stalks?)?\s*(.*)$',
          'i'
        ) AS match_parts
      FROM public.recipes r
      CROSS JOIN LATERAL unnest(COALESCE(r.ingredients, ARRAY[]::text[])) AS v(item)
      WHERE trim(v.item) <> ''
        AND NOT EXISTS (
          SELECT 1
          FROM public.ingredients i
          WHERE i.recipe_id = r.id
        )
    ) s;

  ELSE
    RAISE EXCEPTION 'Unsupported type for public.recipes.ingredients: %', ingredients_udt;
  END IF;
END $$;

-- Optional verification query:
-- SELECT r.title, COUNT(i.*) AS ingredient_count
-- FROM public.recipes r
-- LEFT JOIN public.ingredients i ON i.recipe_id = r.id
-- GROUP BY r.id, r.title
-- ORDER BY r.title;
