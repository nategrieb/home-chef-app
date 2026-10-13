import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { authCookieOptions } from './lib/auth-cookie'
import { cleanupLegacyAuthCookies } from './lib/legacy-cookie-cleanup'

/**
 * 1) One-time cleanup of old per-site sign-in cookies.
 * 2) Signed-out visitors loading a page are sent to /login (the real lock is the database;
 *    this just keeps the app from opening for people who can't use it).
 */
export async function proxy(request: NextRequest) {
  const cleaned = cleanupLegacyAuthCookies(request)
  if (cleaned) return cleaned

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isPageLoad = request.method === 'GET' && request.headers.get('accept')?.includes('text/html')
  const { pathname } = request.nextUrl

  if (!url || !key || !isPageLoad || pathname.startsWith('/login') || pathname.startsWith('/auth/')) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data } = await supabase.auth.getUser()

  if (!data.user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth/|.*\\.(?:svg|png|jpg|jpeg|webp|ico|webmanifest)$).*)'],
}
