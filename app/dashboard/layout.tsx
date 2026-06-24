import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { ThemeToggle } from '@/components/theme/theme-toggle'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link href="/dashboard" className="font-heading text-xl tracking-wide-soft">
          Simvites
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.email}
          </span>
          <ThemeToggle />
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-[0.7rem] uppercase tracking-wide-soft text-muted-foreground transition-colors hover:text-gold-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  )
}
