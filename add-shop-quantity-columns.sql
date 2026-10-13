-- Separate "what you cook with" from "what you buy".
-- amount/unit stay the cooking measure (4 cloves garlic);
-- shop_amount/shop_unit are optional and drive the shopping list (1 head garlic).
alter table chef.ingredients
  add column if not exists shop_amount numeric,
  add column if not exists shop_unit text;
