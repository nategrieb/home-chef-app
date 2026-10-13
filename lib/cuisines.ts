/**
 * How recipes are grouped and filtered: a food style (Vegan, Pescetarian) plus cuisines.
 * A recipe can have several, e.g. ["Vegan", "Indian"]. Stored in recipes.dietary_preference
 * (the column name is historical; it now holds these labels).
 */
export const CUISINE_OPTIONS = [
  'Vegan',
  'Pescetarian',
  'Mediterranean',
  'Middle Eastern',
  'Indian',
  'Japanese',
  'Korean',
  'Thai',
  'Chinese',
  'Asian',
  'Mexican',
  'Italian',
  'American',
] as const;

export type CuisineOption = (typeof CUISINE_OPTIONS)[number];

export const CUISINE_EMOJI: Record<CuisineOption, string> = {
  Vegan: '🌱',
  Pescetarian: '🐟',
  Mediterranean: '🫒',
  'Middle Eastern': '🧆',
  Indian: '🍛',
  Japanese: '🍱',
  Korean: '🥢',
  Thai: '🌶️',
  Chinese: '🥡',
  Asian: '🍜',
  Mexican: '🌮',
  Italian: '🍝',
  American: '🍔',
};
