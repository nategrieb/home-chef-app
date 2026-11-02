/**
 * Ingredient names that match the wrong food when searched as-is, with the search that finds the right one.
 * Keys are lowercase ingredient names (the recipe's canonical name). Add to this when a recipe's nutrition draft
 * picks something odd.
 */
export const FOOD_SEARCH_OVERRIDES: Record<string, string> = {
  berries: 'blueberries',
  'mixed berries': 'blueberries',
  'kosher salt': 'salt table',
  'sea salt': 'salt table',
  salt: 'salt table',
  tofu: 'tofu raw firm',
  'extra-firm tofu': 'tofu raw firm',
  'firm tofu': 'tofu raw firm',
  'silken tofu': 'tofu silken',
  'miso paste': 'miso',
  'white miso paste': 'miso',
  'red miso': 'miso',
  'white miso': 'miso',
  'ground coriander': 'spices coriander seed',
  'fennel seeds': 'spices fennel seed',
  'sweet potato': 'sweet potato raw unprepared',
  'sweet potatoes': 'sweet potato raw unprepared',
  'greek yogurt': 'yogurt greek plain',
  'toasted sesame oil': 'oil sesame',
  'sesame oil': 'oil sesame',
  'chili garlic sauce': 'hot sauce',
  harissa: 'hot sauce',
  sriracha: 'hot sauce',
  jalapeño: 'peppers jalapeno raw',
  jalapeno: 'peppers jalapeno raw',
  avocado: 'avocados raw all commercial varieties',
  lemon: 'lemons raw without peel',
  lime: 'limes raw',
  tuna: 'fish tuna light canned in water',
  'chipotle peppers in adobo': 'peppers hot chili canned',
  kombu: 'seaweed kelp raw',
  'fire-roasted diced tomatoes': 'tomatoes red ripe canned',
  'diced tomatoes': 'tomatoes red ripe canned',
};

/** Seasonings, garnishes and "to taste" items with no amount in the recipe. They count as zero, silently. */
export const NO_AMOUNT_OK = /^(salt|sea salt|kosher salt|pepper|black pepper|white pepper|water|ice|cooking spray|parsley|cilantro|basil|mint|dill|chives|scallions?|green onions?|thyme|rosemary|oregano|bay leaf|bay leaves|red pepper flakes|chili flakes|paprika|cumin|turmeric|cinnamon|garlic powder|onion powder|spices?|herbs?|lemon zest|lime zest|zest|lime|limes|lemon|lemons|lime wedges|lemon wedges|hot sauce|sesame seeds|microgreens|pickled red onions?|salsa|tamari|soy sauce|olive oil|avocado|greek yogurt|green olives|cilantro leaves|fresh herbs|toppings?|garnish)$/i;

/**
 * Typical weight in grams of one whole item, for counted ingredients ("3 cloves garlic", "1 red bell pepper") where the
 * matched food has no household measure. Checked against the ingredient name; the first match wins.
 */
export const TYPICAL_ITEM_G: [RegExp, number][] = [
  [/garlic/, 4],
  [/baby bell pepper/, 25],
  [/bell pepper/, 150],
  [/jalape/, 14],
  [/cherry tomato|grape tomato/, 150],
  [/tomato/, 120],
  [/lemon/, 60],
  [/lime/, 45],
  [/avocado/, 150],
  [/scallion|green onion/, 15],
  [/onion/, 130],
  [/carrot/, 60],
  [/sweet potato/, 150],
  [/potato/, 170],
  [/persian cucumber/, 70],
  [/cucumber/, 300],
  [/zucchini|summer squash/, 200],
  [/mango/, 330],
  [/kale/, 200],
  [/cauliflower/, 600],
  [/broccoli/, 300],
  [/cabbage/, 900],
  [/radish/, 5],
  [/salmon/, 170],
  [/tortilla/, 45],
  [/kombu/, 10],
];

/** Typical weight of one can, package or jar of a specific thing. */
export const TYPICAL_PACK_G: [RegExp, number][] = [
  [/tofu/, 400],
  [/chickpea|garbanzo|bean|lentil/, 240], // drained weight of a 15 oz can
  [/tomato/, 400],
  [/coconut milk/, 400],
  [/tuna/, 110],
];
