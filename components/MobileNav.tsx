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
    <footer className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md border border-slate-200 px-4 sm:px-6 py-3 rounded-2xl shadow-xl flex gap-4 sm:gap-7 z-50 whitespace-nowrap">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link 
            key={item.path} 
            href={item.path} 
            className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 ${
              isActive ? 'text-[#004225]' : 'text-slate-400'
            }`}
            aria-label={item.name}
          >
            {item.name}
          </Link>
        );
      })}
    </footer>
  );
}