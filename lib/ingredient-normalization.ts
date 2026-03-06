const LEADING_AMOUNT_UNIT =
  /^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*(cups?|tablespoons?|tbsp|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|lb|grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|cans?|cloves?|bunch(?:es)?|pinch(?:es)?|dash(?:es)?|slices?|blocks?|stalks?)?\s*/i;

const PREP_WORDS = new Set([
  'chopped',
  'diced',
  'minced',
  'sliced',
  'julienned',
  'peeled',
  'grated',
  'shredded',
  'crushed',
  'rinsed',
  'drained',
  'cooked',
  'dry',
  'fresh',
  'large',
  'small',
  'medium',
]);

function stripQuantityAndUnit(raw: string): string {
  return raw.replace(LEADING_AMOUNT_UNIT, '').trim();
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function inferCanonicalIngredient(rawItemName: string): string {
  const stripped = stripQuantityAndUnit(rawItemName);
  const parts = stripped.split(',').map((p) => p.trim()).filter(Boolean);
  const base = parts[0] || stripped;

  // Heuristic: if phrase starts with prep descriptors, keep last 1-2 words as the base ingredient.
  const tokens = base.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length > 2 && PREP_WORDS.has(tokens[0])) {
    return titleCase(tokens.slice(-2).join(' '));
  }

  return titleCase(base);
}

export function inferPreparationNote(rawItemName: string, canonicalName?: string): string | null {
  const stripped = stripQuantityAndUnit(rawItemName);
  const parts = stripped.split(',').map((p) => p.trim()).filter(Boolean);

  if (parts.length > 1) {
    return parts.slice(1).join(', ');
  }

  if (canonicalName) {
    const canonicalLower = canonicalName.toLowerCase();
    const strippedLower = stripped.toLowerCase();
    if (strippedLower !== canonicalLower && strippedLower.includes(canonicalLower)) {
      const note = strippedLower.replace(canonicalLower, '').replace(/^[-\s,]+|[-\s,]+$/g, '');
      if (note) return note;
    }
  }

  return null;
}

export function buildShoppingStateKey(canonicalName: string, unit: string): string {
  return `${canonicalName.trim().toLowerCase()}|${unit.trim().toLowerCase() || 'item'}`;
}
