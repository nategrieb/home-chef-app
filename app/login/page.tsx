import Link from 'next/link'
import Header from '../../components/Header'
import GoogleSignInButton from '../../components/GoogleSignInButton'

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>
}

export const metadata = { title: 'Sign in · THE MENU' }

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams

  return (
    <main className="min-h-screen bg-white px-4 sm:px-6 pt-8 sm:pt-10">
      <div className="mx-auto max-w-md">
        <Header />

        <h1 className="page-title-brand text-3xl mb-2">Sign in</h1>
        <p className="text-sm text-slate-500 mb-6">Use your Google account to sign in to The Menu.</p>

        {error === 'google' ? (
          <p className="mb-4 border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Google sign-in didn&apos;t complete. Please try again.
          </p>
        ) : null}

        <GoogleSignInButton />

        <p className="mt-6">
          <Link href="/" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-800">
            Back to the list
          </Link>
        </p>
      </div>
    </main>
  )
}
