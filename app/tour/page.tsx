import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { LiveDemo } from '@/components/landing/live-demo'

export const metadata = { title: `How it works · ${BRAND_NAME}` }

// Beginner tutorial: every element of the platform, in plain English.
const ELEMENTS = [
  { name: 'Templates & website', what: 'Your public wedding site. Pick one of twelve looks, then click any block, hero, story, schedule, gallery, hotel, and edit it like a document. Nothing goes live until you press Publish.' },
  { name: 'Events', what: 'One entry per celebration, Mehndi, Sangeet, Ceremony, Reception, anything. Each has its own date, venue, colour and RSVP deadline. Every other part of the product reuses these.' },
  { name: 'Guests & the invite matrix', what: 'Households and named guests, with one checkbox per guest per event. That checkbox is the whole magic: it decides what each guest can see and answer. Paste your list in from a spreadsheet.' },
  { name: 'Invitations', what: 'Every household gets one private link, no accounts, no codes to mistype. Copy it, WhatsApp it, or email it. You can see who has opened theirs.' },
  { name: 'RSVPs', what: 'Guests answer per event on their phone, with your questions (meals, dietary, songs), and download a keepsake PDF. You watch live counts, chase non-responders, and export one sheet for the caterer.' },
  { name: 'Budget, Vendors, Tasks & Files', what: 'The planning side. A vendor marked "booked" shows up in your budget, your tasks and your dashboard, enter things once, see them everywhere.' },
  { name: 'Reports', what: 'One-click CSVs of everything, guest list, RSVPs by event, budget, vendors, tasks. Open in Excel or hand straight to a supplier.' },
  { name: 'The unlock', what: 'Build everything free. One payment unlocks publishing your site and sending invitations, no subscription, yours for the whole wedding.' },
]

export default function TourPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-[1060px] items-center justify-between px-6 py-6">
        <Link href="/" className="text-[13px] font-semibold tracking-tight">{BRAND_NAME}</Link>
        <div className="flex items-center gap-5">
          <Link href="/login" className="text-[13px] font-medium text-ink-2 hover:text-ink">Sign in</Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-[1060px] px-6 pb-24">
        <section className="py-12 text-center sm:py-16">
          <p className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3">How it works</p>
          <h1 className="mx-auto max-w-2xl text-[clamp(30px,4.6vw,52px)] font-[650] leading-[1.05] tracking-[-0.04em]">
            From &ldquo;we&rsquo;re engaged&rdquo; to final headcount.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[14px] text-ink-2">
            Watch the whole flow, then read what each part does, written for
            someone who has never used a wedding tool before.
          </p>
        </section>

        {/* The live demo loop */}
        <section className="mx-auto max-w-3xl rounded-[18px] p-5 sm:p-7" style={{ background: '#0A1220' }}>
          <LiveDemo />
        </section>

        {/* Beginner element guide */}
        <section className="mt-20">
          <h2 className="mb-8 text-center text-lg font-semibold tracking-tight">Every element, explained</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {ELEMENTS.map((e) => (
              <div key={e.name} className="rounded-card border border-line bg-surface p-6 shadow-card">
                <p className="text-[14.5px] font-semibold tracking-tight text-ink">{e.name}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{e.what}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 text-center">
          <Link href="/login"
            className="inline-block rounded-[10px] bg-accent px-8 py-3 text-[14px] font-semibold text-white">
            Try it yourself, free
          </Link>
          <p className="mt-3 text-sm text-ink-3">
            Or see a finished site: <Link href="/s/aanya-and-dev" className="text-accent-ink underline underline-offset-4">Aanya &amp; Dev</Link>
          </p>
        </section>
      </main>
    </div>
  )
}
