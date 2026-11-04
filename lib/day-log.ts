/** Reading one day of the food log (and the goals) for the signed-in person. Shared by the Log page and Today. */

import { supabase } from './supabase';
import type { Goals, LogEntry, MealSlot } from './nutrition';

export const NO_GOALS: Goals = { kcal: null, protein_g: null, carbs_g: null, fat_g: null };

// numeric columns can arrive as strings depending on the driver; normalise once.
export function toEntry(row: Record<string, unknown>): LogEntry {
  return {
    ...(row as unknown as LogEntry),
    grams: Number(row.grams),
    quantity: row.quantity != null ? Number(row.quantity) : null,
    portion_label: (row.portion_label as string | null) ?? null,
    kcal: Number(row.kcal),
    protein_g: Number(row.protein_g),
    carbs_g: Number(row.carbs_g),
    fat_g: Number(row.fat_g),
  };
}

export type DayResult = { entries: LogEntry[]; goals: Goals | null; error: string | null };

export async function fetchDay(day: string): Promise<DayResult> {
  const [log, goalRow] = await Promise.all([
    supabase.from('food_log').select('*').eq('logged_on', day).order('created_at'),
    supabase.from('nutrition_goals').select('kcal, protein_g, carbs_g, fat_g').maybeSingle(),
  ]);
  const goals: Goals | null = goalRow.data
    ? {
        kcal: goalRow.data.kcal != null ? Number(goalRow.data.kcal) : null,
        protein_g: goalRow.data.protein_g != null ? Number(goalRow.data.protein_g) : null,
        carbs_g: goalRow.data.carbs_g != null ? Number(goalRow.data.carbs_g) : null,
        fat_g: goalRow.data.fat_g != null ? Number(goalRow.data.fat_g) : null,
      }
    : null;
  return {
    entries: log.error ? [] : (log.data ?? []).map(toEntry),
    goals,
    error: log.error?.message ?? null,
  };
}

/** Where a quick "log food" lands: the same meal as the latest entry today, or Breakfast for the first one. */
export function nextMeal(entries: LogEntry[]): MealSlot {
  if (entries.length === 0) return 'breakfast';
  return [...entries].sort((a, b) => a.created_at.localeCompare(b.created_at))[entries.length - 1].meal;
}

/** The saved totals for a logged entry after changing its amount: scaled, so foods, custom foods and recipes all edit the same way. */
export function scaledAmount(entry: LogEntry, amount: { grams: number; quantity: number | null; portion_label: string | null }) {
  const f = amount.grams / entry.grams;
  return {
    ...amount,
    kcal: Math.round(entry.kcal * f * 10) / 10,
    protein_g: Math.round(entry.protein_g * f * 10) / 10,
    carbs_g: Math.round(entry.carbs_g * f * 10) / 10,
    fat_g: Math.round(entry.fat_g * f * 10) / 10,
  };
}
