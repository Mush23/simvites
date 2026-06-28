import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'
import { ThemeToggle } from '@/components/theme/theme-toggle'

export default function Home() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-[1060px] items-center justify-between px-6 py-6">
        <span className="font-display text-2xl">{BRAND_NAME}</span>
        <div className="flex items-center gap-5">
          <Link
            href="/login"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3 transition-colors hover:text-accent-ink"
          >
            Sign in
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-[1060px] px-6">
        <section className="grid items-end gap-10 py-20 sm:py-28 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="eyebrow mb-5">Your wedding, beautifully in hand</p>
            <h1 className="font-display text-5xl leading-[1.02] sm:text-6xl md:text-7xl">
              One calm place for the whole celebration.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-2">
              {BRAND_NAME} turns a multi-event South Asian wedding into a single, connected command
              centre — your website, guest list, RSVPs, vendors and budget, all talking to each other.
              Enter once. Reuse everywhere.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="rounded-md bg-accent px-7 py-3 font-semibold text-white shadow-card transition-transform hover:-translate-y-px"
              >
                Start your site
              </Link>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
                Free to build · pay to publish
              </span>
            </div>
          </div>

          <div className="rounded-card border border-line bg-surface p-7 shadow-card">
            <p className="eyebrow mb-3">On track</p>
            <p className="font-display text-6xl nums text-ink">82%</p>
            <p className="mt-2 text-sm text-ink-2">ready for the big weekend</p>
            <div className="mt-5 h-1.5 w-full overflow-hidden rounded-pill bg-paper-2">
              <div className="h-full rounded-pill bg-accent" style={{ width: '82%' }} />
            </div>
            <p className="mt-4 text-sm text-ink-3">3 things need a quick look.</p>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-[1060px] px-6 py-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
          Made with {BRAND_NAME}
        </p>
      </footer>
    </div>
  )
}
