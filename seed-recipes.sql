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
  'Vegan',
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
  'Vegan',
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
  'Vegan',
  50,
  '["Vegetarian", "Healthy", "Baked"]',
  'https://liliebakery.fr/wp-content/uploads/2020/10/Patates-douces-chou-kale-2-Lilie-Bakery.jpg'
);