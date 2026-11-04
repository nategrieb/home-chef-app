import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { fetchDay, NO_GOALS, toEntry } from './day-log';
import { localDateKey, type Goals, type LogEntry } from './nutrition';

export type PlanItem = { id: string; recipeId: string; title: string; category: string | null; hasNutrition: boolean };
export type ActiveOrder = { title: string; updatedAt: string };

type TodayData = {
  entries: LogEntry[];
  goals: Goals;
  logError: string | null;
  plan: PlanItem[];
  order: ActiveOrder | null;
};

/** Monday = 0, matching how the weekly plan stores its days. */
const planDayIndex = () => (new Date().getDay() + 6) % 7;

async function loadPlan(): Promise<PlanItem[]> {
  const { data } = await supabase.from('meal_plans').select('id, recipe:recipes (id, title, category)').eq('day_of_week', planDayIndex());
  const rows = ((data ?? []) as unknown as { id: number | string; recipe: { id: string; title: string; category: string | null } | null }[]).filter((r) => r.recipe);
  if (rows.length === 0) return [];

  // Which of today's recipes can be logged in a tap (have nutrition set up). Empty if that table isn't there yet.
  const { data: nutrition } = await supabase.from('recipe_nutrition').select('recipe_id').in('recipe_id', rows.map((r) => r.recipe!.id));
  const withNutrition = new Set((nutrition ?? []).map((n) => n.recipe_id as string));

  return rows.map((r) => ({
    id: String(r.id),
    recipeId: r.recipe!.id,
    title: r.recipe!.title,
    category: r.recipe!.category,
    hasNutrition: withNutrition.has(r.recipe!.id),
  }));
}

async function loadOrder(): Promise<ActiveOrder | null> {
  const { data } = await supabase
    .from('current_orders')
    .select('order_title, order_notes, order_ingredients, recipe_id, updated_at')
    .eq('id', 'current')
    .maybeSingle();
  if (!data?.updated_at) return null;

  // A cleared or empty order keeps its row; only count one that has something in it.
  let title = (data.order_title as string | null)?.trim() || '';
  const hasIngredients = Array.isArray(data.order_ingredients) && data.order_ingredients.length > 0;
  const hasNotes = Boolean((data.order_notes as string | null)?.trim());
  if (!title && data.recipe_id) {
    const { data: recipe } = await supabase.from('recipes').select('title').eq('id', data.recipe_id).maybeSingle();
    title = recipe?.title ?? '';
  }
  if (!title && !hasIngredients && !hasNotes && !data.recipe_id) return null;
  return { title: title || 'Custom order', updatedAt: data.updated_at as string };
}

async function loadToday(day: string): Promise<TodayData> {
  const [result, plan, order] = await Promise.all([fetchDay(day), loadPlan().catch(() => []), loadOrder().catch(() => null)]);
  return { entries: result.entries, goals: result.goals ?? NO_GOALS, logError: result.error, plan, order };
}

/** Everything the Today screen shows besides the shopping list. Refreshes when you come back to the app. */
export function useToday() {
  const [day] = useState(() => localDateKey());
  const [data, setData] = useState<TodayData | null>(null);

  const refresh = useCallback(() => loadToday(day).then(setData), [day]);

  useEffect(() => {
    let cancelled = false;
    const run = () =>
      loadToday(day).then((next) => {
        if (!cancelled) setData(next);
      });
    run();
    const onVisible = () => document.visibilityState === 'visible' && run();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [day]);

  return {
    day,
    ready: data !== null,
    entries: data?.entries ?? [],
    goals: data?.goals ?? NO_GOALS,
    logError: data?.logError ?? null,
    plan: data?.plan ?? [],
    order: data?.order ?? null,
    addEntry: (entry: LogEntry) =>
      setData((prev) => (prev ? { ...prev, entries: [...prev.entries, toEntry(entry as unknown as Record<string, unknown>)] } : prev)),
    /** Change an entry's amount (already saved) or drop a deleted one, without reloading the day. */
    updateEntry: (id: string, patch: Partial<LogEntry>) =>
      setData((prev) => (prev ? { ...prev, entries: prev.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) } : prev)),
    removeEntry: (id: string) => setData((prev) => (prev ? { ...prev, entries: prev.entries.filter((e) => e.id !== id) } : prev)),
    setGoals: (goals: Goals) => setData((prev) => (prev ? { ...prev, goals } : prev)),
    refresh,
  };
}
