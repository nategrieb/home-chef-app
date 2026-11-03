"use client";
import { useEffect, useRef, useState } from 'react';
import type { Food } from './nutrition';
import { filterAndRank } from './food-match';

type Response = { foods?: Food[]; usda?: string; error?: string };

const NOTICES: Record<string, string> = {
  rate_limited: 'Food database is busy. Showing saved foods only; try again in a few minutes.',
  cache_failed: 'Couldn’t load new foods just now. Try the search again.',
  unavailable: 'Food database is unreachable. Showing saved foods only.',
};

/**
 * Search as you type. Saved foods appear almost at once, the full search (with the food database) follows a moment
 * later, and results already on screen are narrowed instantly as you add words, so the list never lags behind what
 * you typed. Finished searches are remembered for the session.
 */
export function useFoodSearch(query: string) {
  const [results, setResults] = useState<Food[]>([]);
  const [searchedFor, setSearchedFor] = useState('');
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const cache = useRef(new Map<string, Response>());
  const q = query.trim();

  useEffect(() => {
    if (q.length < 2) return;
    const key = q.toLowerCase();
    const cached = cache.current.get(key);
    if (cached) {
      setResults(cached.foods ?? []);
      setSearchedFor(key);
      setNotice(cached.error ?? (cached.usda ? NOTICES[cached.usda] ?? null : null));
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const get = async (mode: 'local' | 'full') => {
      const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}${mode === 'local' ? '&mode=local' : ''}`, { signal: controller.signal });
      return (await res.json()) as Response;
    };
    setSearching(true);

    const quick = setTimeout(async () => {
      try {
        const body = await get('local');
        if (controller.signal.aborted) return;
        setResults(body.foods ?? []);
        setSearchedFor(key);
      } catch {
        // Aborted by a newer keystroke, or offline.
      }
    }, 90);

    const full = setTimeout(async () => {
      try {
        const body = await get('full');
        if (controller.signal.aborted) return;
        if (!body.error && body.usda !== 'rate_limited' && body.usda !== 'unavailable') cache.current.set(key, body);
        setResults(body.foods ?? []);
        setSearchedFor(key);
        setNotice(body.error ?? (body.usda ? NOTICES[body.usda] ?? null : null));
      } catch {
        // Aborted by a newer keystroke, or offline.
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(quick);
      clearTimeout(full);
      controller.abort();
    };
  }, [q]);

  // Whatever is on screen is narrowed to the words typed so far, right away; the server answer then replaces it.
  const shown = q.length >= 2 && searchedFor ? filterAndRank(results, q) : [];
  return { results: shown, searching: searching && shown.length === 0, notice };
}
