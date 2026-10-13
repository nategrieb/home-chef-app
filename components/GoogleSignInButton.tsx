'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function GoogleSignInButton() {
  const [error, setError] = useState<string | null>(null)

  async function signIn() {
    setError(null)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

    if (oauthError) setError("Couldn't start Google sign-in. Please try again.")
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={signIn}
        className="w-full border border-slate-300 bg-white px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-slate-900 transition active:scale-95 hover:bg-slate-50"
      >
        Continue with Google
      </button>
      {error ? <p className="border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </div>
  )
}
