-- Add image_url column to recipes table if it doesn't exist
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Example insert for Kale & Sweet Potato Salad
INSERT INTO recipes (
  title, description, ingredients, instructions, category, dietary_preference, total_time, tags, image_url
) VALUES (
  'Kale & Sweet Potato Salad',
  'A hearty vegan salad with roasted sweet potatoes, kale, and a creamy tahini dressing.',
  '["1 large sweet potato, peeled and cubed", "1 bunch kale, chopped", "1/4 cup tahini", "1 lemon, juiced", "1 can chickpeas, drained", "1/4 cup pumpkin seeds", "Salt and pepper to taste"]',
  '["Roast sweet potatoes at 400°F for 25 minutes.", "Massage kale with lemon juice and salt.", "Whisk tahini, lemon juice, salt, and pepper for dressing.", "Toss kale, sweet potatoes, chickpeas, and pumpkin seeds with dressing."]',
  'Lunch',
  '["Vegan"]',
  40,
  '["Salad", "Healthy", "Vegan"]',
  'https://dishingouthealth.com/wp-content/uploads/2022/10/KaleSweetPotatoSalad_1.jpg'
);

-- Example insert for Vegan-Friendly Korean Bibimbap
INSERT INTO recipes (
  title, description, ingredients, instructions, category, dietary_preference, total_time, tags, image_url
) VALUES (
  'Vegan-Friendly Korean Bibimbap',
  'A plant-based take on the classic Korean rice bowl with colorful veggies and gochujang sauce.',
  '["2 cups cooked rice", "1 cup spinach", "1 cup bean sprouts", "1 carrot, julienned", "1 zucchini, julienned", "1/2 cup mushrooms, sliced", "2 tbsp gochujang", "1 tbsp sesame oil", "1 block tofu, cubed"]',
  '["Sauté each vegetable separately.", "Pan-fry tofu until golden.", "Arrange rice in bowls, top with veggies and tofu.", "Drizzle with gochujang and sesame oil."]',
  'Dinner',
  '["Vegan"]',
  45,
  '["Korean", "Rice Bowl", "Vegan"]',
  'https://www.myeclecticbites.com/wp-content/uploads/2020/03/Bibimbap-1.jpg'
);

-- Example insert for Sweet Potatoes with Spiced Chickpeas & Kale
INSERT INTO recipes (
  title, description, ingredients, instructions, category, dietary_preference, total_time, tags, image_url
) VALUES (
  'Sweet Potatoes with Spiced Chickpeas & Kale',
  'Oven-baked sweet potatoes topped with spiced chickpeas and sautéed kale.',
  '["2 sweet potatoes", "1 can chickpeas", "1 tsp smoked paprika", "1/2 tsp cumin", "1 bunch kale", "2 tbsp olive oil", "Salt and pepper to taste"]',
  '["Bake sweet potatoes at 400°F for 45 minutes.", "Sauté chickpeas with spices.", "Sauté kale until wilted.", "Top sweet potatoes with chickpeas and kale."]',
  'Dinner',
  '["Vegan"]',
  50,
  '["Vegetarian", "Healthy", "Baked"]',
  'https://liliebakery.fr/wp-content/uploads/2020/10/Patates-douces-chou-kale-2-Lilie-Bakery.jpg'
);

-- Insert additional recipes (Tofu + Quinoa) for the app
-- Tofu and Sweet Potato Peanut Butter Curry
WITH new_recipe AS (
  INSERT INTO recipes (title, description, source_url, category, dietary_preference, total_time, tags, instructions)
  VALUES (
    'Tofu and Sweet Potato Peanut Butter Curry',
    'A rich, creamy Thai-inspired curry with extra-firm tofu and sweet potatoes in a savory peanut sauce.',
    'https://cooking.nytimes.com/recipes/767371284-tofu-and-sweet-potato-peanut-butter-curry',
    'Dinner',
    '["Vegan"]',
    45,
    '["Curry","Tofu","Thai"]',
    '[
      "Prepare the tofu by cutting it into 1cm cubes and roasting at 200°C for 15 minutes.",
      "Sauté finely sliced spring onions, ginger, and garlic in coconut oil for 30 seconds.",
      "Add soy sauce, red Thai curry paste, and sugar; stir for 1 minute.",
      "Pour in coconut milk and reduce for 3-4 minutes. Whisk in peanut butter until smooth.",
      "Add cubed sweet potatoes and simmer for 15-20 minutes until soft.",
      "Stir in the roasted tofu, sugar snap peas, and lime juice before serving over rice."
    ]'
  ) RETURNING id
)
INSERT INTO ingredients (recipe_id, item_name, canonical_name, preparation_note, amount, unit, calories_per_unit)
VALUES
  ((SELECT id FROM new_recipe), 'Firm Tofu', 'Firm Tofu', NULL, 280, 'g', 0),
  ((SELECT id FROM new_recipe), 'Sweet Potatoes', 'Sweet Potatoes', NULL, 600, 'g', 0),
  ((SELECT id FROM new_recipe), 'Smooth Peanut Butter', 'Smooth Peanut Butter', NULL, 80, 'g', 0),
  ((SELECT id FROM new_recipe), 'Coconut Milk', 'Coconut Milk', NULL, 400, 'ml', 0),
  ((SELECT id FROM new_recipe), 'Red Thai Curry Paste', 'Red Thai Curry Paste', NULL, 3, 'tbsp', 0),
  ((SELECT id FROM new_recipe), 'Vegetable Stock', 'Vegetable Stock', NULL, 400, 'ml', 0),
  ((SELECT id FROM new_recipe), 'Coconut Oil', 'Coconut Oil', NULL, 1, 'tbsp', 0);

-- Baked Tofu with Peanut Sauce and Coconut-Lime Rice
WITH new_recipe AS (
  INSERT INTO recipes (title, description, source_url, category, dietary_preference, total_time, tags, instructions)
  VALUES (
    'Baked Tofu with Peanut Sauce and Coconut-Lime Rice',
    'Crispy baked tofu paired with a fragrant West African-inspired peanut sauce and bright coconut rice.',
    'https://cooking.nytimes.com/recipes/1020530-baked-tofu-with-peanut-sauce-and-coconut-lime-rice',
    'Dinner',
    '["Vegan"]',
    50,
    '["Tofu","Peanut Sauce","Rice"]',
    '[
      "Preheat oven to 450°F. Drizzle lime juice over sliced bell peppers and set aside to quick-pickle.",
      "Simmer rice with coconut milk and 1 cup water until tender (12-15 mins).",
      "Whisk peanut butter, miso, ginger, fish sauce, and honey until smooth.",
      "Brush tofu slabs with peanut sauce and bake on a sheet pan for 12-15 minutes until charred.",
      "Assemble bowls with greens, coconut rice, and baked tofu; top with pickled peppers."
    ]'
  ) RETURNING id
)
INSERT INTO ingredients (recipe_id, item_name, canonical_name, preparation_note, amount, unit, calories_per_unit)
VALUES
  ((SELECT id FROM new_recipe), 'Extra-firm Tofu', 'Extra-firm Tofu', NULL, 28, 'oz', 0),
  ((SELECT id FROM new_recipe), 'Long-grain Rice', 'Long-grain Rice', NULL, 1, 'cup', 0),
  ((SELECT id FROM new_recipe), 'Natural Peanut Butter', 'Natural Peanut Butter', NULL, 1, 'cup', 0),
  ((SELECT id FROM new_recipe), 'Full-fat Coconut Milk', 'Full-fat Coconut Milk', NULL, 0.5, 'cup', 0),
  ((SELECT id FROM new_recipe), 'Red Miso', 'Red Miso', NULL, 1, 'tbsp', 0),
  ((SELECT id FROM new_recipe), 'Lime Juice', 'Lime Juice', NULL, 0.66, 'cup', 0),
  ((SELECT id FROM new_recipe), 'Baby Bell Peppers', 'Baby Bell Peppers', NULL, 8, 'count', 0);

-- Lemon Miso Tofu with Broccoli
WITH new_recipe AS (
  INSERT INTO recipes (title, description, source_url, category, dietary_preference, total_time, tags, instructions)
  VALUES (
    'Lemon Miso Tofu with Broccoli',
    'A high-protein, sheet-pan dinner featuring lacquered tofu and smoky charred broccoli.',
    'https://cooking.nytimes.com/recipes/1026706-lemon-miso-tofu-with-broccoli',
    'Dinner',
    '["Vegan"]',
    40,
    '["Tofu","Sheet Pan","Broccoli"]',
    '[
      "Preheat oven to 220°C. Toss broccoli florets and tofu cubes with oil on a sheet pan.",
      "Bake for 15 minutes. While baking, whisk miso, maple syrup, soy sauce, and rice vinegar over low heat.",
      "Flip tofu and broccoli; brush half the miso glaze over the tofu.",
      "Bake 8-10 minutes more until tofu is crisp and broccoli is charred.",
      "Serve over brown rice with remaining glaze and sesame seeds."
    ]'
  ) RETURNING id
)
INSERT INTO ingredients (recipe_id, item_name, canonical_name, preparation_note, amount, unit, calories_per_unit)
VALUES
  ((SELECT id FROM new_recipe), 'Firm Tofu', 'Firm Tofu', NULL, 300, 'g', 0),
  ((SELECT id FROM new_recipe), 'Broccoli Head', 'Broccoli Head', NULL, 1, 'large', 0),
  ((SELECT id FROM new_recipe), 'White Miso', 'White Miso', NULL, 2, 'tbsp', 0),
  ((SELECT id FROM new_recipe), 'Maple Syrup', 'Maple Syrup', NULL, 2, 'tbsp', 0),
  ((SELECT id FROM new_recipe), 'Rice Vinegar', 'Rice Vinegar', NULL, 1, 'tbsp', 0),
  ((SELECT id FROM new_recipe), 'Cooked Brown Rice', 'Cooked Brown Rice', NULL, 2, 'cups', 0);

-- Rainbow Quinoa Salad
WITH new_recipe AS (
  INSERT INTO recipes (title, description, source_url, category, dietary_preference, total_time, tags, instructions)
  VALUES (
    'Rainbow Quinoa Salad',
    'A vibrant kaleidoscope of fresh vegetables and fluffy quinoa with a zesty lemon dressing.',
    'https://cooking.nytimes.com/recipes/1016222-rainbow-quinoa-salad',
    'Lunch',
    '["Vegetarian"]',
    30,
    '["Salad","Quinoa","Vegetarian"]',
    '[
      "Simmer quinoa in water for 20 minutes until fluffy; let sit for 10 minutes.",
      "Dice cucumber, bell peppers, and cherry tomatoes.",
      "Finely chop mint, parsley, and chives.",
      "Whisk olive oil and lemon juice together for the dressing.",
      "Toss all ingredients together in a large bowl and top with crumbled feta and pine nuts."
    ]'
  ) RETURNING id
)
INSERT INTO ingredients (recipe_id, item_name, canonical_name, preparation_note, amount, unit, calories_per_unit)
VALUES
  ((SELECT id FROM new_recipe), 'Quinoa', 'Quinoa', NULL, 1, 'cup', 0),
  ((SELECT id FROM new_recipe), 'Cucumber', 'Cucumber', NULL, 1, 'cup', 0),
  ((SELECT id FROM new_recipe), 'Bell Pepper', 'Bell Pepper', NULL, 1, 'cup', 0),
  ((SELECT id FROM new_recipe), 'Cherry Tomatoes', 'Cherry Tomatoes', NULL, 1, 'cup', 0),
  ((SELECT id FROM new_recipe), 'Feta Cheese', 'Feta Cheese', NULL, 1, 'cup', 0),
  ((SELECT id FROM new_recipe), 'Fresh Parsley', 'Fresh Parsley', NULL, 1, 'cup', 0),
  ((SELECT id FROM new_recipe), 'Lemon Juice', 'Lemon Juice', NULL, 0.33, 'cup', 0);

-- Quinoa Salad with Chickpeas and Tomatoes
WITH new_recipe AS (
  INSERT INTO recipes (title, description, source_url, category, dietary_preference, total_time, tags, instructions)
  VALUES (
    'Quinoa Salad with Chickpeas and Tomatoes',
    'A sturdy, meal-prep friendly salad featuring roasted vegetables and protein-rich chickpeas.',
    'https://cooking.nytimes.com/recipes/1024829-quinoa-salad',
    'Lunch',
    '["Vegetarian"]',
    35,
    '["Salad","Quinoa","Meal Prep"]',
    '[
      "Preheat oven to 400°F. Roast diced sweet potatoes and bell peppers for 20 minutes.",
      "Rinse quinoa and toast in a saucepan with garlic for 2 minutes before adding stock.",
      "Simmer quinoa for 15 minutes, then fluff and cool.",
      "Whisk together Dijon mustard, honey, and apple cider vinegar.",
      "Combine roasted vegetables, quinoa, and drained chickpeas; toss with dressing."
    ]'
  ) RETURNING id
)
INSERT INTO ingredients (recipe_id, item_name, canonical_name, preparation_note, amount, unit, calories_per_unit)
VALUES
  ((SELECT id FROM new_recipe), 'Quinoa', 'Quinoa', NULL, 0.66, 'cup', 0),
  ((SELECT id FROM new_recipe), 'Chickpeas (Canned)', 'Chickpeas (Canned)', NULL, 1, 'can', 0),
  ((SELECT id FROM new_recipe), 'Sweet Potato', 'Sweet Potato', NULL, 300, 'g', 0),
  ((SELECT id FROM new_recipe), 'Dijon Mustard', 'Dijon Mustard', NULL, 3, 'tbsp', 0),
  ((SELECT id FROM new_recipe), 'Honey', 'Honey', NULL, 2, 'tbsp', 0),
  ((SELECT id FROM new_recipe), 'Apple Cider Vinegar', 'Apple Cider Vinegar', NULL, 2, 'tbsp', 0);
