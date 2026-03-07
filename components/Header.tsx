"use client";
import Link from 'next/link';
import { ReactNode } from 'react';

interface HeaderProps {
  children?: ReactNode;
}

export default function Header({ children }: HeaderProps) {
  return (
    <header className="flex justify-between items-end mb-10">
      <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <div className="brand-mark-triangle" aria-hidden="true" />
        <p className="text-sm md:text-base font-bold tracking-wider text-zinc-900 uppercase">THE MENU</p>
      </Link>
      <div className="flex items-end gap-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Kitchen of Grieb</p>
        {children}
      </div>
    </header>
  );
}