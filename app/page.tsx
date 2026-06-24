import Link from 'next/link'
import { ThemeToggle } from '@/components/theme/theme-toggle'

const USPS = [
  {
    title: 'Per-event invitations',
    body: 'Invite different people to the Sangeet, Vidhi, Wedding and Reception. Uninvited events simply disappear for that household.',
  },
  {
    title: 'Multi-event fluency',
    body: 'Built for South Asian weddings first — multiple days, multiple venues, capacity caps, all handled gracefully.',
  },
  {
    title: 'All in one place',
    body: 'Guest list, RSVPs, personalised invitation links and live updates. No spreadsheets, no glue, no chasing.',
  },
  {
    title: 'Editorial design',
    body: 'Premium templates with light and dark mode that look hand-built, not drag-and-drop generic.',
  },
]

export default function MarketingHome() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-heading text-2xl tracking-wide-soft">Simvites</span>
        <div className="flex items-center gap-3">
          <Link
            href="/preview"
            className="text-[0.7rem] uppercase tracking-wide-soft text-muted-foreground transition-colors hover:text-gold-ink"
          >
            See a template
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-16 text-center sm:pt-28">
        <p className="mb-5 text-[0.7rem] uppercase tracking-luxury text-gold-ink">
          Event websites, beautifully done
        </p>
        <h1 className="font-heading text-5xl font-light leading-[1.02] sm:text-7xl">
          The wedding website your
          <span className="text-gold"> celebration </span>
          deserves
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Simvites turns a multi-day South Asian wedding into one elegant site —
          per-event invitations, a real RSVP engine, and live updates, with a
          design bar that rivals anything hand-built.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/preview"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-8 py-3 text-[0.7rem] uppercase tracking-wide-soft text-primary-foreground transition-opacity hover:opacity-90"
          >
            Preview Template #1
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-8 py-3 text-[0.7rem] uppercase tracking-wide-soft text-foreground transition-colors hover:border-gold hover:text-gold-ink"
          >
            Start building
          </Link>
        </div>
      </section>

      {/* USPs */}
      <section className="border-t border-border bg-secondary/40 py-20">
        <div className="mx-auto grid max-w-5xl gap-x-12 gap-y-10 px-6 sm:grid-cols-2">
          {USPS.map((u) => (
            <div key={u.title}>
              <h3 className="font-heading text-2xl font-light text-foreground">
                {u.title}
              </h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{u.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-12 text-center">
        <p className="text-[0.65rem] uppercase tracking-luxury text-muted-foreground/70">
          Simvites · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}
