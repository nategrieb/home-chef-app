"use client";
import { useEffect, useState } from 'react';
import { TOAST_EVENT } from '../lib/toast';

/** Shows the latest toast() message for a couple of seconds, above the bottom nav. */
export default function ToastHost() {
  const [message, setMessage] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onToast = (e: Event) => {
      setMessage({ id: Date.now(), text: String((e as CustomEvent<string>).detail) });
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), 2200);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      clearTimeout(timer);
    };
  }, []);

  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[200] flex justify-center px-4" role="status" aria-live="polite">
      <div key={message.id} className="toast-in rounded-full bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl">
        {message.text}
      </div>
    </div>
  );
}
