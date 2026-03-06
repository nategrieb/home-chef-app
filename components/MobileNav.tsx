"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileNav() {
  const pathname = usePathname();
  
  const navItems = [
    { name: 'Menu', path: '/' },
    { name: 'Plan', path: '/meal-plan' },
    { name: 'List', path: '/shopping-list' },
  ];

  return (
    <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md border border-slate-200 px-8 py-4 rounded-full shadow-2xl flex gap-10 z-50 whitespace-nowrap">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link 
            key={item.path} 
            href={item.path} 
            className={`text-xs font-black uppercase tracking-[0.15em] transition-all active:scale-95 ${
              isActive ? 'text-[#004225]' : 'text-slate-400'
            }`}
          >
            {item.name}
          </Link>
        );
      })}
    </footer>
  );
}