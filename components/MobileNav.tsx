"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileNav() {
  const pathname = usePathname();
  
  const navItems = [
    { name: 'Menu', path: '/' },
    { name: 'List', path: '/shopping-list' },
    { name: 'Plan', path: '/meal-plan' },
    { name: 'Order', path: '/submit-order' },
    { name: 'Settings', path: '/settings' },
  ];

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
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95 ${
                  isActive
                    ? 'bg-[#004225] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
                aria-label={item.name}
              >
                {item.name}
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
                {item.name}
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
          className="underline hover:text-slate-700"
        >
          nategrieb.com
        </a>
      </div>
    </>
  );
}