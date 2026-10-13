import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cookie-based session so a Google sign-in carries across pages (and, later, across *.nategrieb.com).
// Signed-out visitors behave exactly as before (the public key, no session).
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, { db: { schema: 'chef' } })
