import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { FlowPlayer } from './tour/flow-player'

// The landing is a scroll journey: float in, dive into a real screen
// recording of the product, glide through the modules, land on the offer.
// Key words are gold. Copy carries no dashes.

const GOLD = { color: 'oklch(0.68 0.13 80)' }

const MODULES = ['Website builder', 'Guest list', 'Invitations', 'RSVPs', 'Seating', 'Budget', 'Vendors', 'Tasks', 'Files', 'Reports']

const FEATURES = [
  { t: 'Every guest sees only their events', d: 'One checkbox per guest per event decides everything. Uninvited events simply do not exist for that household. This is the heart of a multi event wedding, done properly.' },
  { t: 'Personal links, zero accounts', d: 'Each family gets one private link by WhatsApp, email or a printed QR code. They tap, they answer, they get a keepsake PDF. No passwords, no forms, no friction.' },
  { t: 'A website they will screenshot', d: 'Two editorial templates, real typography, per event colour identities. Click any text and type. Publish when you are ready and never before.' },
  { t: 'The command centre', d: 'Budget, vendors, tasks, files and seating all talk to each other. Book a caterer once and watch it appear in your budget, your checklist and your dashboard.' },
  { t: 'Answers you can hand to a caterer', d: 'Live counts per event, meal totals, dietary notes, a chase list of who has not replied, and one clean spreadsheet export for every supplier.' },
  { t: 'Live updates after the big send', d: 'Seating plan ready? One button tells every seated family. They open their link and see their table. Your site keeps working long after the invites go out.' },
]

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-clip bg-paper text-ink">
      <header className="mx-auto flex max-w-[1060px] items-center justify-between px-6 py-6">
        <span className="font-display text-2xl">{BRAND_NAME}</span>
        <div className="flex items-center gap-5">
          <Link href="/tour" className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3 transition-colors hover:text-accent-ink">How it works</Link>
          <Link href="/login" className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3 transition-colors hover:text-accent-ink">Sign in</Link>
          <ThemeToggle />
        </div>
      </header>

      {/* HERO — floating light, huge serif, gold key words */}
      <section className="relative px-6 pb-20 pt-16 text-center sm:pt-24">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <span className="orb absolute left-[12%] top-[18%] h-56 w-56 rounded-pill" style={{ background: 'oklch(0.68 0.13 80 / 0.16)' }} />
          <span className="orb orb2 absolute right-[10%] top-[38%] h-72 w-72 rounded-pill" style={{ background: 'var(--accent-soft)' }} />
        </div>
        <p className="eyebrow relative mb-5">The wedding platform for multi event celebrations</p>
        <h1 className="relative mx-auto max-w-3xl font-display text-5xl leading-[1.03] sm:text-7xl">
          One <span style={GOLD}>beautiful</span> place for the
          whole celebration, from <span style={GOLD}>first invite</span> to
          <span style={GOLD}> final headcount</span>.
        </h1>
        <p className="relative mx-auto mt-7 max-w-xl text-lg text-ink-2">
          Build a stunning website, invite every guest to exactly the right events,
          watch RSVPs land live and run the whole plan from one calm dashboard.
          All of it <span className="font-semibold" style={GOLD}>zero code</span>.
        </p>
        <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/login" className="bg-accent px-8 py-3.5 font-semibold text-white shadow-card">Start building free</Link>
          <Link href="/s/aanya-and-dev" className="font-mono text-[11px] uppercase tracking-[0.18em] underline underline-offset-4" style={GOLD}>See a live wedding site</Link>
        </div>
        {/* Marquee */}
        <div className="relative mt-16 overflow-hidden border-y border-line py-3" aria-hidden>
          <div className="marquee whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.22em] text-ink-3">
            {[...MODULES, ...MODULES].map((m, i) => (
              <span key={i} className="mx-6">{m} <span style={GOLD}>✦</span></span>
            ))}
          </div>
        </div>
      </section>

      {/* THE DIVE — the real screen recording, centre stage */}
      <section data-land className="mx-auto max-w-2xl px-6 py-16">
        <p className="eyebrow mb-3 text-center">Watch it happen</p>
        <h2 className="mb-8 text-center font-display text-4xl">
          Sixty seconds inside the <span style={GOLD}>editor</span>
        </h2>
        <FlowPlayer />
      </section>

      {/* FEATURES — the journey through the platform */}
      <section className="mx-auto max-w-[1060px] px-6 py-16">
        <h2 className="mb-10 text-center font-display text-4xl">
          Built for weddings that span <span style={GOLD}>days</span>, not hours
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.t} data-land
              className="rounded-card border border-line bg-surface p-6 shadow-card transition-transform duration-300 hover:-translate-y-1 hover:shadow-lift">
              <p className="font-display text-xl text-ink">{f.t}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TEMPLATES */}
      <section data-land className="border-y border-line bg-paper-2 px-6 py-16 text-center">
        <h2 className="font-display text-4xl">Two looks, both <span style={GOLD}>yours</span></h2>
        <p className="mx-auto mt-3 max-w-md text-ink-2">Pick a template, swap any time. Your live site never changes until you publish.</p>
        <div className="mx-auto mt-8 flex max-w-lg flex-wrap justify-center gap-5">
          {[{ n: 'Editorial Gold', s: ['#F5EFE3', '#C9A227', '#7A1F1F'] }, { n: 'Editorial Luxury', s: ['#F6F1E9', '#211D18', '#B08D57'] }].map((t) => (
            <div key={t.n} className="w-52 rounded-card border border-line bg-surface p-5 shadow-card transition-transform hover:-translate-y-1">
              <div className="flex justify-center gap-2">{t.s.map((c) => <span key={c} className="h-6 w-6 rounded-pill border border-line" style={{ background: c }} />)}</div>
              <p className="mt-3 font-display text-lg text-ink">{t.n}</p>
            </div>
          ))}
        </div>
      </section>

      {/* OFFER */}
      <section data-land className="px-6 py-20 text-center">
        <p className="eyebrow mb-3">Early access</p>
        <h2 className="mx-auto max-w-lg font-display text-4xl">
          Build everything <span style={GOLD}>free</span>. Pay once when you are ready to send.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-ink-2">
          No subscription. One payment unlocks publishing and sending, and your site stays
          live for 18 months after the wedding. Early couples shape the product and keep founder pricing.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link href="/login" className="bg-accent px-8 py-3.5 font-semibold text-white shadow-card">Start your site</Link>
          <a href="mailto:maharshi.sim@hotmail.com?subject=Simvites%20early%20access"
            className="font-mono text-[11px] uppercase tracking-[0.18em] underline underline-offset-4" style={GOLD}>
            Talk to the founder
          </a>
        </div>
      </section>

      <footer className="mx-auto max-w-[1060px] px-6 py-12 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">Made with {BRAND_NAME}</p>
      </footer>

      <style>{`
        @keyframes orbfloat { from { transform: translateY(0) scale(1) } to { transform: translateY(-28px) scale(1.12) } }
        .orb { filter: blur(46px); animation: orbfloat 9s ease-in-out infinite alternate }
        .orb2 { animation-duration: 13s; animation-delay: -4s }
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .marquee { display: inline-block; animation: marquee 28s linear infinite }
        @keyframes landin { from { opacity: 0.001; transform: translateY(26px) } to { opacity: 1; transform: none } }
        @supports (animation-timeline: view()) {
          [data-land] { animation: landin 0.9s cubic-bezier(0.16,1,0.3,1) both; animation-timeline: view(); animation-range: entry 0% entry 38%; }
        }
      `}</style>
    </div>
  )
}
