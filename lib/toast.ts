/** Fire-and-forget confirmation: toast('Added to Lunch'). Shown by ToastHost; on Android it also gives a light buzz. */
export const TOAST_EVENT = 'menu:toast';

export function toast(message: string) {
  if (typeof window === 'undefined') return;
  navigator.vibrate?.(8);
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: message }));
}
