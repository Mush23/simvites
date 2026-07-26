import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { MANIFESTS } from '@/lib/templates/manifest'
import { TemplateRender } from '@/components/templates/template-render'
import { ScaleToFit } from '@/components/templates/scale-to-fit'
import { coupleSeed } from '@/lib/templates/couple-seed'
import { DEMO_SEED } from '@/lib/templates/seed'
import { BRAND_NAME } from '@/lib/brand'
import { TemplatesClient } from './templates-client'

export const metadata = { title: `Templates · ${BRAND_NAME}` }

// The in-app gallery. Every thumbnail is the REAL template component tree,
// server-rendered at desktop width and scaled into a 4:3 card, seeded with this
// couple's own names, date, venue and events.
//
// Phase 2 gave the choice a home; Phase 3 gives it something to look at. It was
// eighteen radio buttons with three 8px colour dots each.

export default async function TemplatesPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('sites').select('theme').eq('id', site!.siteId).maybeSingle()
  const appliedKey = (row?.theme as { template?: string } | null)?.template ?? 'editorial-gold'
  const applied = MANIFESTS.find((m) => m.id === appliedKey)

  const seed = (await coupleSeed()) ?? DEMO_SEED

  // Server-rendered once, handed to the client gallery as opaque nodes. The
  // filtering and preview shell never re-render these.
  const thumbs = MANIFESTS.map((m) => (
    <ScaleToFit key={m.id} ratio={m.aspect[0] / m.aspect[1]}>
      <TemplateRender templateKey={m.id} seed={seed} truncate={3} />
    </ScaleToFit>
  ))

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <PageHeader
        eyebrow="The site"
        title="Choose your look"
        description={
          applied
            ? `You're using ${applied.name}. Each of these shows your own wedding — ${seed.coupleNames}, ${seed.dateText} — so what you preview is what your guests get. Nothing goes live until you publish.`
            : 'Each template brings its own typography, palette and detailing — not just a colour swap.'
        }
      />

      <TemplatesClient templates={MANIFESTS} thumbs={thumbs} appliedKey={appliedKey} />

      <p className="mt-8 border-t border-line pt-4 text-[12.5px] text-ink-3">
        Changing template restyles your site&apos;s type, colour and geometry. Your content, pages
        and guest data are untouched — and your live site stays as it is until you publish again.
      </p>
    </div>
  )
}
