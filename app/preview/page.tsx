import Link from 'next/link'
import { TEMPLATES } from '@/lib/templates/registry'
import { TemplatePreview } from '@/components/templates/template-preview'
import { BRAND_NAME } from '@/lib/brand'

export const metadata = { title: `Templates · ${BRAND_NAME}` }

// Public template gallery — real previews (type, colour, geometry, motif) of
// every look, so couples can browse before signing up.
export default function TemplateGalleryPage() {
  return (
    <div className="min-h-screen bg-paper px-6 py-14 text-ink">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-10 text-center">
          <Link href="/" className="text-[13px] font-semibold tracking-tight">{BRAND_NAME}</Link>
          <h1 className="mt-4 text-[clamp(28px,4vw,44px)] font-[650] tracking-[-0.03em]">{TEMPLATES.length} looks, one wedding</h1>
          <p className="mx-auto mt-3 max-w-xl text-[14px] text-ink-2">
            Every template brings its own typography, palette and details — not just a colour swap.
            Pick a starting point; you can change anything later.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <Link key={t.key} href={`/preview/${t.key}`} className="group block">
              <TemplatePreview template={t} compact />
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="font-display text-[15px] text-ink">{t.name}</span>
                <span className="text-[11.5px] text-ink-3 group-hover:text-accent-ink">View →</span>
              </div>
              {t.mood && <p className="text-[11.5px] text-ink-3">{t.mood}</p>}
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/login" className="inline-block rounded-[10px] bg-accent px-6 py-3 text-[14px] font-semibold text-white">
            Start building free
          </Link>
        </div>
      </div>
    </div>
  )
}
