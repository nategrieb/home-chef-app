/**
 * Matching and ranking for the food search. Every word you type has to match a word in the food's name (or brand),
 * in any order, so each word you add narrows the list. The last word is treated as unfinished while you type, so
 * "chicken br" finds breast and "oat milk unsw" finds unsweetened.
 */

import { foodSearchScore } from './nutrition';

const words = (text: string) => text.toLowerCase().replace(/['’]/g, '').split(/[^a-z0-9]+/).filter(Boolean);

/** "tomatoes" -> "tomato", "berries" -> "berry", "eggs" -> "egg". Applied to both sides, so it only has to be consistent. */
export function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.endsWith('oes')) return word.slice(0, -2);
  if (word.endsWith('ss')) return word;
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

/** What to look for in a database LIKE: the word without a plural ending, so one pattern finds both forms. */
export function likeStem(word: string): string {
  return word.length > 3 ? word.replace(/(ies|es|s)$/, '') || word : word;
}

export const queryWords = (query: string) => words(query).slice(0, 6);

type Food = { name: string; brand: string | null };

/** null when the food does not match every word; otherwise a score where higher is a better match. */
export function matchScore(food: Food, query: string): number | null {
  const terms = queryWords(query);
  if (terms.length === 0) return null;
  const nameWords = words(food.name);
  const brandWords = food.brand ? words(food.brand) : [];
  const all = [...nameWords, ...brandWords];
  const stems = all.map(stem);

  let score = 0;
  for (let t = 0; t < terms.length; t++) {
    const term = terms[t];
    const termStem = stem(term);
    const isLast = t === terms.length - 1;
    let best = -1;
    let bestAt = -1;
    for (let i = 0; i < all.length; i++) {
      let points = -1;
      if (stems[i] === termStem) points = 3;
      else if (isLast && (all[i].startsWith(term) || stems[i].startsWith(termStem))) points = 2; // still typing this word
      else if (!isLast && term.length >= 5 && all[i].startsWith(term)) points = 1;
      if (points > best) {
        best = points;
        bestAt = i;
      }
    }
    if (best < 0) return null;
    score += best;
    // Foods that lead with what you typed ("Yogurt, Greek...") beat ones that mention it late.
    if (bestAt < nameWords.length) score += Math.max(0, 2 - bestAt * 0.5);
  }
  // A name with few extra words is closer to what was asked for.
  score -= Math.max(0, nameWords.length - terms.length) * 0.12;
  return score + foodSearchScore(food.name, food.brand, query);
}

/** Keep the foods that match every word, best first, dropping repeats of the same food. */
export function filterAndRank<T extends Food & { source?: string }>(foods: T[], query: string): T[] {
  const scored = foods
    .map((food) => ({ food, score: matchScore(food, query) }))
    .filter((entry): entry is { food: T; score: number } => entry.score !== null);

  scored.sort(
    (a, b) =>
      Number(b.food.source === 'custom') - Number(a.food.source === 'custom') ||
      b.score - a.score ||
      a.food.name.length - b.food.name.length
  );

  const seen = new Set<string>();
  const out: T[] = [];
  for (const { food } of scored) {
    const key = `${food.name.toLowerCase()}|${(food.brand ?? '').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(food);
  }
  return out;
}
