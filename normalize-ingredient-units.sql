-- Normalize ingredient rows that were backfilled as "1 item"
-- This parses leading quantity + common unit from item_name and updates:
--   amount, unit, item_name
-- It only touches rows where amount=1 and unit='item'.

WITH parsed AS (
  SELECT
    i.id,
    i.item_name AS raw_item_name,
    regexp_match(
      i.item_name,
      '^\s*(\d+\s+\d+/\d+|\d+/\d+|\d+(?:\.\d+)?)\s*(cups?|tablespoons?|tbsp|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|lb|grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|cans?|cloves?|bunch(?:es)?|pinch(?:es)?|dash(?:es)?|slices?|blocks?|stalks?)?\s*(.*)$',
      'i'
    ) AS m
  FROM public.ingredients i
  WHERE i.amount = 1
    AND lower(i.unit) = 'item'
), converted AS (
  SELECT
    p.id,
    p.raw_item_name,
    p.m,
    CASE
      WHEN p.m IS NULL THEN NULL::numeric
      WHEN p.m[1] ~ '^\d+\s+\d+/\d+$' THEN
        split_part(p.m[1], ' ', 1)::numeric
        + split_part(split_part(p.m[1], ' ', 2), '/', 1)::numeric
          / NULLIF(split_part(split_part(p.m[1], ' ', 2), '/', 2)::numeric, 0)
      WHEN p.m[1] ~ '^\d+/\d+$' THEN
        split_part(p.m[1], '/', 1)::numeric
        / NULLIF(split_part(p.m[1], '/', 2)::numeric, 0)
      ELSE p.m[1]::numeric
    END AS parsed_amount,
    CASE
      WHEN p.m IS NULL OR p.m[2] IS NULL OR btrim(p.m[2]) = '' THEN 'item'
      ELSE CASE lower(p.m[2])
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
        ELSE lower(p.m[2])
      END
    END AS parsed_unit,
    CASE
      WHEN p.m IS NULL THEN p.raw_item_name
      WHEN p.m[3] IS NULL OR btrim(p.m[3]) = '' THEN p.raw_item_name
      ELSE btrim(p.m[3])
    END AS parsed_item_name
  FROM parsed p
)
UPDATE public.ingredients i
SET
  amount = c.parsed_amount,
  unit = c.parsed_unit,
  item_name = c.parsed_item_name
FROM converted c
WHERE i.id = c.id
  AND c.m IS NOT NULL;

-- Optional review query
-- SELECT recipe_id, item_name, amount, unit
-- FROM public.ingredients
-- ORDER BY recipe_id, item_name;
