import { supabase } from './supabase'
import { clearShoppingCache } from './shopping'

/** Shared with AccessGate: remembers a recent "yes, this person has access" so pages load instantly. */
export const ACCESS_CACHE_KEY = 'menu:access:v1'

/** Sign out and leave nothing behind on this device (saved list, remembered access). */
export async function signOutOfMenu() {
  clearShoppingCache()
  try {
    window.sessionStorage.removeItem(ACCESS_CACHE_KEY)
  } catch {
    // storage unavailable
  }
  await supabase.auth.signOut()
  window.location.assign('/login')
}
