import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getPrimarySite } from '@/lib/workspace'
import { Sidebar } from '@/components/app/sidebar'
import { ThemeToggle } from '@/components/theme/theme-toggle'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const site = await getPrimarySite()
  if (!site) redirect('/onboarding')

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-paper px-6 py-3.5">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-lg text-ink">{site.title}</span>
            <span className="rounded-pill border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3">
              {site.status}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3 sm:inline">
              {user.email}
            </span>
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3 transition-colors hover:text-accent-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
