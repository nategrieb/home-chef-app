"use client";
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/** What one serving of a recipe gives you, plus whether it is still a draft worth checking. */
export type ServingMacros = { kcal: number; protein_g: number; carbs_g: number; fat_g: number; review: 'estimated' | 'check' | null };

/** Per-serving macros for every recipe that has nutrition, keyed by recipe id. Empty until loaded (or if there is none). */
export function useRecipeNutrition() {
  const [byRecipe, setByRecipe] = useState<Map<string, ServingMacros>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('recipe_nutrition').select('recipe_id, servings, kcal, protein_g, carbs_g, fat_g, review');
      if (cancelled || !data) return;
      const map = new Map<string, ServingMacros>();
      for (const row of data as { recipe_id: string; servings: number; kcal: number; protein_g: number; carbs_g: number; fat_g: number; review: 'estimated' | 'check' | null }[]) {
        const n = Number(row.servings) || 1;
        map.set(row.recipe_id, {
          kcal: Number(row.kcal) / n,
          protein_g: Number(row.protein_g) / n,
          carbs_g: Number(row.carbs_g) / n,
          fat_g: Number(row.fat_g) / n,
          review: row.review ?? null,
        });
      }
      setByRecipe(map);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return byRecipe;
}
