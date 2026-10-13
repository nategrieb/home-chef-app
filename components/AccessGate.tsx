'use client'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { ACCESS_CACHE_KEY, signOutOfMenu } from '../lib/menu-session'
import { clearShoppingCache } from '../lib/shopping'

const APP_KEY = 'chef'
const ACCESS_CACHE_MS = 5 * 60 * 1000

type GateState = { status: 'checking' } | { status: 'allowed' } | { status: 'denied'; email: string | null } | { status: 'error' }

function readCachedAccess(userId: string): boolean {
  try {
    const raw = window.sessionStorage.getItem(ACCESS_CACHE_KEY)
    if (!raw) return false
    const cached = JSON.parse(raw) as { userId: string; until: number }
    return cached.userId === userId && cached.until > Date.now()
  } catch {
    return false
  }
}

function writeCachedAccess(userId: string) {
  try {
    window.sessionStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify({ userId, until: Date.now() + ACCESS_CACHE_MS }))
  } catch {
    // storage unavailable; the check just runs again next time
  }
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white via-white to-slate-100 px-4 py-10">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  )
}

/**
 * Wraps every page. Signed-out visitors are sent to /login (the proxy does this before the page
 * loads; this is the backstop for an expired session). Signed-in people are checked against the
 * shared permissions (platform.has_app_access) and shown a "no access" screen if they have none.
 */
export default function AccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isPublicPath = pathname.startsWith('/login') || pathname.startsWith('/auth')
  const [state, setState] = useState<GateState>({ status: 'checking' })

  const check = useCallback(async () => {
    setState({ status: 'checking' })

    const { data } = await supabase.auth.getSession()
    const session = data.session
    if (!session) {
      window.location.assign('/login')
      return
    }

    if (readCachedAccess(session.user.id)) {
      setState({ status: 'allowed' })
      return
    }

    // Typed loosely: this client is pinned to the "chef" schema, but the permissions live in "platform".
    const platform = (supabase as unknown as {
      schema: (name: string) => { rpc: (fn: string, args: Record<string, string>) => PromiseLike<{ data: unknown; error: unknown }> }
    }).schema('platform')
    const { data: allowed, error } = await platform.rpc('has_app_access', { p_app: APP_KEY })

    if (error) {
      setState({ status: 'error' })
      return
    }

    if (allowed === true) {
      writeCachedAccess(session.user.id)
      setState({ status: 'allowed' })
      return
    }

    clearShoppingCache()
    setState({ status: 'denied', email: session.user.email ?? null })
  }, [])

  useEffect(() => {
    if (isPublicPath) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check()
  }, [isPublicPath, check])

  if (isPublicPath || state.status === 'allowed') return <>{children}</>

  if (state.status === 'denied') {
    return (
      <Centered>
        <div className="border border-slate-200 bg-white px-6 py-8 text-center shadow-[0_16px_36px_rgba(15,23,42,0.06)] sm:px-8">
          <div className="brand-mark-triangle mx-auto mb-5" aria-hidden="true" />
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">No access yet</h1>
          <p className="mt-2 text-sm text-slate-500">
            {state.email ? `You're signed in as ${state.email}, but ` : ''}this account doesn&apos;t have access to The Menu. Ask Nate to
            add you.
          </p>
          <button
            type="button"
            onClick={signOutOfMenu}
            className="mt-6 w-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 active:scale-95"
          >
            Sign out
          </button>
        </div>
      </Centered>
    )
  }

  if (state.status === 'error') {
    return (
      <Centered>
        <div className="border border-slate-200 bg-white px-6 py-8 text-center sm:px-8">
          <h1 className="text-lg font-semibold text-slate-900">Couldn&apos;t check your access</h1>
          <p className="mt-2 text-sm text-slate-500">Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => void check()}
            className="mt-6 w-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 active:scale-95"
          >
            Try again
          </button>
        </div>
      </Centered>
    )
  }

  // checking: quiet branded placeholder (no data requests until we know the person is allowed)
  return (
    <Centered>
      <div className="flex justify-center" aria-busy="true" aria-label="Loading">
        <div className="brand-mark-triangle animate-pulse" aria-hidden="true" />
      </div>
    </Centered>
  )
}
