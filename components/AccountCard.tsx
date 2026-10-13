'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function AccountCard() {
  const [email, setEmail] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setEmail(null)
  }

  return (
    <section className="mb-6 bg-slate-50 border border-slate-200 rounded-3xl p-4">
      <h2 className="text-xs font-black text-slate-700 uppercase tracking-[0.2em] mb-3">Account</h2>
      {email === undefined ? (
        <p className="text-xs text-slate-500">Checking…</p>
      ) : email ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-700 break-all">Signed in as {email}</p>
          <button onClick={signOut} className="shrink-0 text-xs font-black uppercase tracking-wider text-red-600 px-2 py-2">
            Sign out
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Not signed in.</p>
          <Link href="/login" className="shrink-0 text-xs font-black uppercase tracking-wider text-[#004225] px-2 py-2">
            Sign in
          </Link>
        </div>
      )}
    </section>
  )
}
