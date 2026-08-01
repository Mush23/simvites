import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'
import { LEGAL_CONTACT_EMAIL, LEGAL_REVIEWED, LEGAL_UPDATED } from '@/lib/legal'

// Shared shell for /privacy, /terms and /cookies. Plain prose, generous
// measure — these are read, not skimmed, and usually by someone worried.

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line px-6 py-4">
        <div className="mx-auto flex max-w-[760px] items-center justify-between gap-4">
          <Link href="/" className="text-[13px] font-semibold tracking-tight">{BRAND_NAME}</Link>
          <nav className="flex items-center gap-4 text-[12.5px] text-ink-2">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/cookies" className="hover:text-ink">Cookies</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-6 py-12">
        {/* Renders until a human has actually signed these off. Flipping
            LEGAL_REVIEWED is a deliberate act; a draft that quietly looks
            authoritative is worse than one that admits what it is. */}
        {!LEGAL_REVIEWED && (
          <p className="mb-10 rounded-card border border-warn/40 bg-warn-soft px-4 py-3 text-[13px] leading-relaxed text-ink">
            <strong>Draft — not yet reviewed by a solicitor.</strong> The facts below
            describe what {BRAND_NAME}{' '}
            actually does with data, but the wording has not been checked for legal
            sufficiency. Please don&rsquo;t rely on it yet.
          </p>
        )}

        <div className="legal-prose">{children}</div>

        <p className="mt-14 border-t border-line pt-5 text-[12.5px] text-ink-3">
          Last updated {LEGAL_UPDATED}. Questions about any of this:{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline underline-offset-2 hover:text-ink">
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
      </main>
    </div>
  )
}
