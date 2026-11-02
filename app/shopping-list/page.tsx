import { redirect } from 'next/navigation';

// The shopping list lives at /list. Kept so old bookmarks and home-screen icons still work.
export default function ShoppingListRedirect() {
  redirect('/list');
}
