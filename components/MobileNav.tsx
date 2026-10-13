"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { countToGet, fetchShoppingSnapshot, readShoppingCache, subscribeToShoppingChanges } from '../lib/shopping';

export default function MobileNav() {
  const pathname = usePathname();
  const [toGet, setToGet] = useState(0);

  // Badge on "List": instant from the cache, then kept fresh (also live when you or your wife change the list).
  useEffect(() => {
    const cached = readShoppingCache();
    if (cached) setToGet(countToGet(cached));

    const refresh = () => fetchShoppingSnapshot().then((snapshot) => setToGet(countToGet(snapshot))).catch(() => {});
    refresh();
    return subscribeToShoppingChanges(refresh);
  }, []);

  const navItems = [
    { name: 'List', path: '/shopping-list' },
    { name: 'Recipes', path: '/' },
    { name: 'Plan', path: '/meal-plan' },
    { name: 'Order', path: '/submit-order' },
  ];

  const label = (item: { name: string; path: string }) => (
    <>
      {item.name}
      {item.path === '/shopping-list' && toGet > 0 ? (
        <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black leading-5 text-white">
          {toGet}
        </span>
      ) : null}
    </>
  );

  return (
    <>
      <footer className="sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md border border-slate-200 px-3 py-2 rounded-2xl shadow-xl z-50 whitespace-nowrap">
        <div className="flex gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`px-3.5 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all active:scale-95 ${
                  isActive
                    ? 'bg-[#004225] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
                aria-label={item.name}
              >
                {label(item)}
              </Link>
            );
          })}
        </div>
      </footer>

      <nav className="hidden sm:block fixed bottom-0 inset-x-0 border-t border-slate-200 bg-white/95 backdrop-blur-md z-50">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-center gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-[0.14em] transition-colors ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-transparent'
                }`}
                aria-label={item.name}
              >
                {label(item)}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* signature link for desktop, outside menu */}
      <div className="hidden sm:block text-center text-xs text-slate-500 py-2">
        <a
          href="https://nategrieb.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-700 text-sm font-bold tracking-wider uppercase"
        >
          NATE GRIEB
        </a>
      </div>
    </>
  );
}