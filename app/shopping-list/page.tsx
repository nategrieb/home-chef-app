import { redirect } from 'next/navigation';

// The shopping list is now the homepage. Kept so old bookmarks and home-screen icons still work.
export default function ShoppingListRedirect() {
  redirect('/');
}
