"use client";

import Link from 'next/link';
import MobileNav from '../../components/MobileNav';
import AccountCard from '../../components/AccountCard';

/** Settings: who you're signed in as, and where to change your nutrition goals. Reached from the gear on Today. */
export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-white pb-44 px-4 sm:px-6 pt-8 sm:pt-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to Today"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 active:bg-slate-100"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="page-title-brand text-3xl sm:text-4xl">Settings</h1>
        </div>

        <AccountCard />

        <Link
          href="/?goals=1"
          className="mt-3 flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 active:bg-slate-100"
        >
          <span>
            <span className="block text-sm font-black text-slate-900">Nutrition goals</span>
            <span className="block text-xs font-bold text-slate-500">Daily calories and macros</span>
          </span>
          <span aria-hidden="true" className="text-xl font-black text-slate-400">›</span>
        </Link>
      </div>

      <MobileNav />
    </main>
  );
}
