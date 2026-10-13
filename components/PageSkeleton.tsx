import Header from './Header'
import MobileNav from './MobileNav'

/**
 * Loading state shaped like the real page (same background, header, title and bottom nav),
 * so moving between List / Recipes / Plan / Order never flashes an empty or dark screen.
 */
export default function PageSkeleton({ title, variant = 'page' }: { title?: string; variant?: 'page' | 'detail' }) {
  if (variant === 'detail') {
    return (
      <main className="min-h-screen bg-white pb-44" aria-busy="true">
        <div className="border-b border-slate-100 bg-white/85">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2.5 sm:px-6">
            <div className="h-9 w-9 animate-pulse bg-slate-100" />
            <div className="h-9 w-9 animate-pulse bg-slate-100" />
          </div>
        </div>
        <div className="mx-auto max-w-2xl px-6 pt-8">
          <div className="mb-6 h-[240px] animate-pulse border border-slate-100 bg-slate-50 sm:h-[320px]" />
          <div className="mb-3 h-8 w-3/4 animate-pulse bg-slate-100" />
          <div className="mb-8 h-4 w-1/2 animate-pulse bg-slate-100" />
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse border border-slate-100 bg-slate-50" />
            ))}
          </div>
        </div>
        <MobileNav />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-white to-slate-100 px-4 pb-44 pt-8 sm:px-6 sm:pt-10" aria-busy="true">
      <Header />
      <div className="mb-8">
        {title ? (
          <h1 className="page-title-brand text-3xl sm:text-4xl">{title}</h1>
        ) : (
          <div className="h-9 w-48 animate-pulse bg-slate-100" />
        )}
        <div className="mt-3 h-3 w-32 animate-pulse bg-slate-100" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse border border-slate-100 bg-slate-50" />
        ))}
      </div>
      <MobileNav />
    </main>
  )
}
