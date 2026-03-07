"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import MobileNav from '../../components/MobileNav';

interface IngredientAlias {
  raw_term: string;
  canonical_name: string;
  created_at?: string;
}

export default function SettingsPage() {
  const [aliases, setAliases] = useState<IngredientAlias[]>([]);
  const [rawAlias, setRawAlias] = useState('');
  const [canonicalAlias, setCanonicalAlias] = useState('');
  const [aliasBusy, setAliasBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchAliases() {
    const { data, error } = await supabase
      .from('ingredient_aliases')
      .select('raw_term, canonical_name, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      setLoading(false);
      return;
    }

    setAliases(data || []);
    setLoading(false);
  }

  async function addAlias() {
    const raw = rawAlias.trim().toLowerCase();
    const canonical = canonicalAlias.trim();
    if (!raw || !canonical || aliasBusy) return;

    setAliasBusy(true);
    const { data, error } = await supabase
      .from('ingredient_aliases')
      .upsert(
        {
          raw_term: raw,
          canonical_name: canonical,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'raw_term' }
      )
      .select('raw_term, canonical_name, created_at')
      .single();

    if (error) {
      alert(error.message || 'Could not save alias.');
      setAliasBusy(false);
      return;
    }

    if (data) {
      await supabase
        .from('ingredients')
        .update({ canonical_name: data.canonical_name })
        .ilike('item_name', `%${data.raw_term}%`);

      setAliases((prev) => {
        const others = prev.filter((a) => a.raw_term !== data.raw_term);
        return [data, ...others];
      });
      setRawAlias('');
      setCanonicalAlias('');
    }
    setAliasBusy(false);
  }

  async function deleteAlias(rawTerm: string) {
    const { error } = await supabase
      .from('ingredient_aliases')
      .delete()
      .eq('raw_term', rawTerm);

    if (!error) {
      setAliases((prev) => prev.filter((a) => a.raw_term !== rawTerm));
    }
  }

  useEffect(() => {
    fetchAliases();
  }, []);

  return (
    <main className="min-h-screen bg-white pb-44 px-4 sm:px-6 pt-8 sm:pt-10">
      <header className="mb-8">
        <p className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-[0.2em] mb-3 shadow-sm">
          System Settings
        </p>
        <h1 className="text-4xl font-black text-slate-900 leading-tight tracking-tighter">
          Settings
        </h1>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
          Ingredient Grouping
        </p>
      </header>

      <section className="bg-slate-50 border border-slate-200 rounded-3xl p-4">
        <h2 className="text-xs font-black text-slate-700 uppercase tracking-[0.2em] mb-3">
          Ingredient Aliases
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          Group variations like "baby carrots" under a canonical name like "Carrot".
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          <input
            type="text"
            value={rawAlias}
            onChange={(e) => setRawAlias(e.target.value)}
            placeholder="Raw term (e.g. baby carrots)"
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#004225]"
            style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
          />
          <input
            type="text"
            value={canonicalAlias}
            onChange={(e) => setCanonicalAlias(e.target.value)}
            placeholder="Canonical name (e.g. Carrot)"
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#004225]"
            style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
          />
        </div>
        <button
          onClick={addAlias}
          disabled={aliasBusy || !rawAlias.trim() || !canonicalAlias.trim()}
          className="px-4 py-2 rounded-xl bg-[#004225] text-white text-sm font-bold disabled:opacity-50"
        >
          Save Alias
        </button>

        <div className="mt-4">
          {loading ? (
            <p className="text-xs text-slate-500">Loading aliases...</p>
          ) : aliases.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {aliases.map((alias) => (
                <div
                  key={alias.raw_term}
                  className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-2"
                >
                  <span className="text-sm text-slate-700">
                    <span className="font-semibold">{alias.raw_term}</span> {'->'} {alias.canonical_name}
                  </span>
                  <button
                    onClick={() => deleteAlias(alias.raw_term)}
                    className="text-xs font-black uppercase tracking-wider text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No aliases yet.</p>
          )}
        </div>
      </section>

      <MobileNav />
    </main>
  );
}
