/**
 * Portions: the units a food can be logged in. Everything is still stored in grams; a portion is just
 * "how many grams is one of these", so 2 large eggs, 1 bar, 3 slices and 150 g all end up as grams.
 */

export type PortionKind = 'count' | 'volume' | 'weight';

export type Portion = {
  /** What one unit is called: "large egg", "slice", "bar", "tbsp", "g". */
  label: string;
  /** Grams in ONE unit. */
  grams: number;
  kind: PortionKind;
  /** How much the +/- buttons change the quantity. */
  step: number;
  /** For a labelled serving: the amount on the label ("2 scoops" -> 2). Defaults to 1. */
  startQuantity?: number;
};

export type UsdaPortion = {
  amount?: number;
  gramWeight?: number;
  modifier?: string;
  portionDescription?: string;
  measureUnit?: { name?: string };
};

export type PortionFood = {
  name: string;
  serving_g: number | null;
  serving_label: string | null;
};

export const GRAM: Portion = { label: 'g', grams: 1, kind: 'weight', step: 10 };
export const OUNCE: Portion = { label: 'oz', grams: 28.3495, kind: 'weight', step: 0.5 };

const VOLUME = /\b(cups?|tbsp|tablespoons?|tsp|teaspoons?|fl\.? ?oz|ml|liters?|litres?)\b/i;
const SIZE_ONLY = /^(extra small|small|medium|large|extra large|jumbo|mini)$/i;
/** Units that mean "one of the thing", as opposed to "1 breast, bone removed". Only these become the default unit. */
const NATURAL = /\b(small|medium|large|jumbo|slice|slices|piece|pieces|each|item|bar|patty|egg|cookie|muffin|bagel|roll|pita|tortilla|link|stick|serving)\b/i;

/** "Bananas, raw" -> "banana", "Egg, whole" -> "egg", "Potatoes" -> "potato". */
export function singularNoun(foodName: string): string {
  const first = (foodName.split(',')[0] ?? '').trim().toLowerCase();
  if (/oes$/.test(first)) return first.slice(0, -2);
  if (/ies$/.test(first)) return `${first.slice(0, -3)}y`;
  if (/[^s]s$/.test(first)) return first.slice(0, -1);
  return first;
}

function cleanLabel(raw: string, foodName: string): string {
  const text = raw
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\btablespoons?\b/, 'tbsp')
    .replace(/\bteaspoons?\b/, 'tsp');
  return SIZE_ONLY.test(text) ? `${text} ${singularNoun(foodName)}` : text;
}

function leadingAmount(text: string): number {
  const m = text.trim().match(/^(\d+)?\s*(?:(\d+)\/(\d+))?/);
  if (!m) return 1;
  const whole = m[1] ? Number(m[1]) : 0;
  const frac = m[2] && m[3] ? Number(m[2]) / Number(m[3]) : 0;
  return whole + frac > 0 ? whole + frac : 1;
}

/** The labelled serving of a branded product or custom food ("1 BAR (68 g)", "2 tbsp (30 g)", "48 g"). */
export function servingPortion(food: PortionFood): Portion | null {
  if (!food.serving_g || food.serving_g <= 0) return null;
  const label = (food.serving_label ?? '').trim();
  const amount = leadingAmount(label);
  const name = label
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^[\d\s./]+/, '')
    .trim()
    .toLowerCase();
  const isPlainGrams = name === '' || /^(g|gram|grams|grm)$/.test(name);
  const text = isPlainGrams ? 'serving' : amount !== 1 ? singularNoun(name) : name;
  return {
    label: text,
    grams: food.serving_g / (isPlainGrams ? 1 : amount),
    kind: VOLUME.test(text) ? 'volume' : 'count',
    step: VOLUME.test(text) ? 0.5 : 1,
    startQuantity: isPlainGrams ? 1 : amount,
  };
}

function fromUsda(foodName: string, portions: UsdaPortion[]): Portion[] {
  const out: Portion[] = [];
  for (const p of portions) {
    if (!p.gramWeight || p.gramWeight <= 0 || p.measureUnit?.name === 'RACC') continue;
    const raw = (p.modifier ?? p.portionDescription ?? '').trim();
    if (!raw) continue;
    const label = /nlea serving/i.test(raw) ? 'serving' : cleanLabel(raw, foodName);
    const kind: PortionKind = VOLUME.test(raw) ? 'volume' : 'count';
    out.push({ label, grams: p.gramWeight / (p.amount && p.amount > 0 ? p.amount : 1), kind, step: kind === 'volume' ? 0.5 : 1 });
  }
  return out;
}

export type PortionOptions = {
  portions: Portion[];
  /** Index into `portions` the amount screen starts on. */
  defaultIndex: number;
  defaultQuantity: number;
};

/**
 * Units for a food: its own serving, then USDA household measures (count, then volume), then g and oz.
 * It starts on a natural unit (large egg, slice, bar) when there is one, and on 100 g otherwise.
 */
export function buildPortions(food: PortionFood, usda: UsdaPortion[] = []): PortionOptions {
  const own = servingPortion(food);
  const seen = new Set<string>();
  const household = [...(own ? [own] : []), ...fromUsda(food.name, usda)].filter((p) => {
    const key = `${p.label}|${Math.round(p.grams)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const counts = household.filter((p) => p.kind === 'count').sort((a, b) => Number(b === own) - Number(a === own) || a.grams - b.grams);
  const volumes = household.filter((p) => p.kind === 'volume');
  const portions = [...counts, ...volumes, GRAM, OUNCE];

  const natural = counts.filter((p) => NATURAL.test(p.label));
  // A labelled serving (branded or custom food) is always the starting unit, at the label's own amount (2 tbsp).
  const preferred =
    own ??
    natural.find((p) => /\blarge\b/.test(p.label) && !/extra/.test(p.label)) ??
    natural.find((p) => /\bmedium\b/.test(p.label)) ??
    natural[0];

  if (preferred) return { portions, defaultIndex: portions.indexOf(preferred), defaultQuantity: preferred.startQuantity ?? 1 };
  return { portions, defaultIndex: portions.indexOf(GRAM), defaultQuantity: 100 };
}

const trim = (n: number) => String(Math.round(n * 100) / 100);

/** "2 × large egg · 100 g", or "150 g" when it was logged by weight. */
export function amountText(entry: { grams: number; quantity: number | null; portion_label: string | null }): string {
  const g = `${trim(Number(entry.grams))} g`;
  return entry.portion_label && entry.quantity ? `${trim(Number(entry.quantity))} × ${entry.portion_label} · ${g}` : g;
}

/** Largest single entry accepted (10 kg). Anything above it is almost certainly a typo, e.g. 120 typed next to 150. */
export const MAX_ENTRY_GRAMS = 10000;
