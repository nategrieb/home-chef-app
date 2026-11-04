"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import MobileNav from '../components/MobileNav';
import Header from '../components/Header';
import PageSkeleton from '../components/PageSkeleton';
import AddFoodSheet from '../components/log/AddFoodSheet';
import GoalsSheet from '../components/log/GoalsSheet';
import CaloriesCard from '../components/today/CaloriesCard';
import MealsCard from '../components/today/MealsCard';
import EditEntrySheet from '../components/log/EditEntrySheet';
import { supabase } from '../lib/supabase';
import ListCard from '../components/today/ListCard';
import PlanCard from '../components/today/PlanCard';
import OrderCard from '../components/today/OrderCard';
import { useShoppingList } from '../lib/useShoppingList';
import { useToday } from '../lib/today';
import { nextMeal, scaledAmount } from '../lib/day-log';
import type { LogEntry, MealSlot } from '../lib/nutrition';

type Sheet = { kind: 'log'; meal?: MealSlot } | { kind: 'scan' } | { kind: 'recipe'; recipeId: string } | { kind: 'goals' } | null;

/** Today: calories and quick logging, the shopping list, and (only when they exist) today's plan and the kitchen order. */
export default function Today() {
  const shopping = useShoppingList();
  const today = useToday();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [editing, setEditing] = useState<LogEntry | null>(null);

  // Settings links here to change goals (/?goals=1).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('goals')) setSheet({ kind: 'goals' });
  }, []);

  if (shopping.loading) return <PageSkeleton title="Today" />;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-white to-slate-100 pb-44 px-4 sm:px-6 pt-6 sm:pt-8">
      <div className="mx-auto max-w-2xl">
        <Header compact showSettings>
          <Link href="/submit-order" className="p-2 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-800">
            Order
          </Link>
        </Header>

        <p className="mb-2 px-1 text-[11px] font-black uppercase tracking-widest text-slate-400">{format(new Date(), 'EEEE, MMM d')}</p>

        <div className="space-y-3">
          <CaloriesCard entries={today.entries} goals={today.goals} ready={today.ready} error={today.logError} onEditGoals={() => setSheet({ kind: 'goals' })}>
            <MealsCard entries={today.entries} ready={today.ready} onEdit={setEditing} onAdd={(meal) => setSheet({ kind: 'log', meal })} />
          </CaloriesCard>

          <ListCard shopping={shopping} />

          <PlanCard items={today.plan} onLog={(recipeId) => setSheet({ kind: 'recipe', recipeId })} />
          <OrderCard order={today.order} />
        </div>
      </div>

      {sheet && sheet.kind !== 'goals' && (
        <AddFoodSheet
          meal={sheet.kind === 'log' && sheet.meal ? sheet.meal : nextMeal(today.entries)}
          date={today.day}
          startWith={sheet.kind === 'scan' ? 'scan' : undefined}
          initialRecipeId={sheet.kind === 'recipe' ? sheet.recipeId : undefined}
          onClose={() => setSheet(null)}
          onAdded={today.addEntry}
        />
      )}
      {editing && (
        <EditEntrySheet
          entry={editing}
          onClose={() => setEditing(null)}
          onSave={async (entry, amount) => {
            const next = scaledAmount(entry, amount);
            today.updateEntry(entry.id, next);
            setEditing(null);
            const { error } = await supabase.from('food_log').update(next).eq('id', entry.id);
            if (error) today.refresh();
          }}
          onDelete={async (entry) => {
            today.removeEntry(entry.id);
            setEditing(null);
            const { error } = await supabase.from('food_log').delete().eq('id', entry.id);
            if (error) today.refresh();
          }}
        />
      )}
      {sheet?.kind === 'goals' && <GoalsSheet goals={today.goals} onClose={() => setSheet(null)} onSaved={today.setGoals} />}

      <MobileNav />
    </main>
  );
}
