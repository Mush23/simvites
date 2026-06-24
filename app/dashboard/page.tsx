import Link from 'next/link'
import { ThemeToggle } from '@/components/theme/theme-toggle'

export const metadata = { title: 'Dashboard · Simvites' }

/**
 * Placeholder app shell. The authenticated dashboard (Supabase Auth gate, site
 * list, guest manager, Puck editor) is built in subsequent sprints.
 */
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link href="/" className="font-heading text-xl tracking-wide-soft">
          Simvites
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="mb-3 text-[0.7rem] uppercase tracking-luxury text-gold-ink">
          Coming together
        </p>
        <h1 className="font-heading text-4xl font-light sm:text-5xl">
          Your dashboard
        </h1>
        <p className="mx-auto mt-6 max-w-xl leading-relaxed text-muted-foreground">
          Sign-in (Supabase Auth), your sites, the guest &amp; RSVP manager and
          the visual editor land here next. For now, take a look at{' '}
          <Link href="/preview" className="text-gold-ink underline underline-offset-4">
            Template #1
          </Link>
          .
        </p>
      </main>
    </div>
  )
}
