import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { TEMPLATES } from '@/lib/templates/registry'
import { TemplatePreview } from '@/components/templates/template-preview'
import { BRAND_NAME } from '@/lib/brand'
import { UseTemplateButton } from './use-template'

export const metadata = { title: `Templates · ${BRAND_NAME}` }

// Templates promoted out of Settings (Phase 2). Choosing the look is the most
// emotionally significant decision in the product; it was a radio button on a
// settings page, sitting between the site name and the RSVP deadline.
//
// This is the in-app surface with real per-template previews. The full gallery
// with device toggles and seeded couple data is Phase 3 — what changes here is
// that the choice has a home, and every option shows its actual typography,
// palette and geometry rather than three 8px dots.

export default async function TemplatesPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('sites').select('theme').eq('id', site!.siteId).maybeSingle()
  const currentKey = (row?.theme as { template?: string } | null)?.template ?? 'editorial-gold'
  const current = TEMPLATES.find((t) => t.key === currentKey)

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <PageHeader
        eyebrow="The site"
        title="Choose your look"
        description={
          current
            ? `You're using ${current.name}. Every template brings its own typography, palette and detailing — not just a colour swap. Change it as often as you like; nothing goes live until you publish.`
            : 'Every template brings its own typography, palette and detailing — not just a colour swap.'
        }
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => {
          const applied = t.key === currentKey
          return (
            <div key={t.key}
              className={`rounded-card border bg-surface p-3 shadow-card transition-colors ${
                // The applied template gets a badge and a selection-coloured
                // border — never the brand accent, which is reserved for the
                // action inside the card.
                applied ? 'border-selected-line' : 'border-line hover:border-line-2'
              }`}>
              <TemplatePreview template={t} compact />

              <div className="mt-3 flex items-baseline justify-between gap-2 px-1">
                <div className="min-w-0">
                  <p className="truncate font-display text-[15.5px] text-ink">{t.name}</p>
                  {t.mood && <p className="text-[11.5px] text-ink-3">{t.mood}</p>}
                </div>
                {applied && (
                  <span className="shrink-0 rounded-pill bg-selected-soft px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.09em] text-selected">
                    In use
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 px-1 pb-1">
                {applied ? (
                  <span className="flex-1 text-[12px] text-ink-3">Applied to your site</span>
                ) : (
                  <div className="flex-1">
                    <UseTemplateButton templateKey={t.key} templateName={t.name} />
                  </div>
                )}
                <Link href={`/preview/${t.key}`} target="_blank" rel="noreferrer"
                  className="shrink-0 rounded-md border border-line px-3 py-2 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-line-2 hover:text-ink">
                  Preview ↗
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-8 border-t border-line pt-4 text-[12.5px] text-ink-3">
        Changing template restyles your site&apos;s type, colour and geometry. Your content, pages
        and guest data are untouched — and your live site stays as it is until you publish again.
      </p>
    </div>
  )
}
