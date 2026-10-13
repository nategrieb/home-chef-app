import Link from 'next/link'
import GoogleSignInButton from '../../components/GoogleSignInButton'

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>
}

export const metadata = { title: 'Sign in · THE MENU' }

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white via-white to-slate-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="border border-slate-200 bg-white px-6 py-8 shadow-[0_16px_36px_rgba(15,23,42,0.06)] sm:px-8 sm:py-10">
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <div className="brand-mark-triangle" aria-hidden="true" />
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-900">The Menu</p>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">Sign in</h1>
              <p className="text-sm text-slate-500">Recipes, meal plans and your shopping list.</p>
            </div>
          </div>

          {error === 'google' ? (
            <p className="mb-4 border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Google sign-in didn&apos;t complete. Please try again.
            </p>
          ) : null}

          <GoogleSignInButton />
        </div>

        <p className="mt-5 text-center">
          <Link href="/" className="text-xs text-slate-400 transition-colors hover:text-slate-700 focus-visible:text-slate-700 focus-visible:underline">
            Back to the list
          </Link>
        </p>
      </div>
    </main>
  )
}
