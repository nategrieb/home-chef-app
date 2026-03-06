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
    { name: 'Settings', path: '/settings', icon: 'gear' },
  ];

  return (
    <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md border border-slate-200 px-5 sm:px-8 py-4 rounded-full shadow-2xl flex gap-5 sm:gap-10 z-50 whitespace-nowrap">
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
            {item.icon === 'gear' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.983 5.5a1 1 0 01.934.64l.262.655a1 1 0 00.95.63h.703a1 1 0 01.94.658l.26.686a1 1 0 01-.247 1.063l-.49.49a1 1 0 000 1.414l.49.49a1 1 0 01.246 1.064l-.26.685a1 1 0 01-.94.659h-.703a1 1 0 00-.95.63l-.262.654a1 1 0 01-.934.64h-.696a1 1 0 01-.934-.64l-.262-.655a1 1 0 00-.95-.629H9.17a1 1 0 01-.94-.659l-.26-.685a1 1 0 01.247-1.064l.49-.49a1 1 0 000-1.414l-.49-.49a1 1 0 01-.247-1.063l.26-.686a1 1 0 01.94-.658h.703a1 1 0 00.95-.63l.262-.654a1 1 0 01.934-.641h.696z" />
                <circle cx="12" cy="12" r="3" strokeWidth={2} />
              </svg>
            ) : (
              item.name
            )}
          </Link>
        );
      })}
    </footer>
  );
}