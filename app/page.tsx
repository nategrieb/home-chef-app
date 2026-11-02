"use client";
import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import MobileNav from '../components/MobileNav';
import Header from '../components/Header';
import PageSkeleton from '../components/PageSkeleton';
import AddFoodSheet from '../components/log/AddFoodSheet';
import GoalsSheet from '../components/log/GoalsSheet';
import CaloriesCard from '../components/today/CaloriesCard';
import ListCard from '../components/today/ListCard';
import PlanCard from '../components/today/PlanCard';
import OrderCard from '../components/today/OrderCard';
import { useShoppingList } from '../lib/useShoppingList';
import { useToday } from '../lib/today';
import { nextMeal } from '../lib/day-log';

type Sheet = { kind: 'log' } | { kind: 'scan' } | { kind: 'recipe'; recipeId: string } | { kind: 'goals' } | null;

/** Today: calories and quick logging, the shopping list, and (only when they exist) today's plan and the kitchen order. */
export default function Today() {
  const shopping = useShoppingList();
  const today = useToday();
  const [sheet, setSheet] = useState<Sheet>(null);

  if (shopping.loading) return <PageSkeleton title="Today" />;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-white to-slate-100 pb-44 px-4 sm:px-6 pt-8 sm:pt-10">
      <div className="mx-auto max-w-2xl">
        <Header>
          <Link href="/submit-order" className="p-2 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-800">
            Order
          </Link>
        </Header>

        <div className="mb-5">
          <h1 className="page-title-brand text-3xl sm:text-4xl">Today</h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">{format(new Date(), 'EEEE, MMM d')}</p>
        </div>

        <div className="space-y-5">
          <CaloriesCard
            entries={today.entries}
            goals={today.goals}
            ready={today.ready}
            error={today.logError}
            onEditGoals={() => setSheet({ kind: 'goals' })}
            onLog={() => setSheet({ kind: 'log' })}
            onScan={() => setSheet({ kind: 'scan' })}
          />

          <ListCard shopping={shopping} />

          <PlanCard items={today.plan} onLog={(recipeId) => setSheet({ kind: 'recipe', recipeId })} />
          <OrderCard order={today.order} />
        </div>
      </div>

      {sheet && sheet.kind !== 'goals' && (
        <AddFoodSheet
          meal={nextMeal(today.entries)}
          date={today.day}
          startWith={sheet.kind === 'scan' ? 'scan' : undefined}
          initialRecipeId={sheet.kind === 'recipe' ? sheet.recipeId : undefined}
          onClose={() => setSheet(null)}
          onAdded={today.addEntry}
        />
      )}
      {sheet?.kind === 'goals' && <GoalsSheet goals={today.goals} onClose={() => setSheet(null)} onSaved={today.setGoals} />}

      <MobileNav />
    </main>
  );
}
