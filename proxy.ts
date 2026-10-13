import { NextResponse, type NextRequest } from 'next/server'
import { cleanupLegacyAuthCookies } from './lib/legacy-cookie-cleanup'

/** Runs the one-time old-cookie cleanup on page loads; otherwise passes straight through. */
export function proxy(request: NextRequest) {
  return cleanupLegacyAuthCookies(request) ?? NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth/|.*\\.(?:svg|png|jpg|jpeg|webp|ico|webmanifest)$).*)'],
}
