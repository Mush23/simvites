import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TEMPLATES } from '@/lib/templates/registry'
import { manifestFor } from '@/lib/templates/manifest'
import { TemplateRender } from '@/components/templates/template-render'
import { DEMO_SEED } from '@/lib/templates/seed'
import { BRAND_NAME } from '@/lib/brand'

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ template: t.key }))
}

export async function generateMetadata({ params }: { params: Promise<{ template: string }> }) {
  const { template } = await params
  const m = manifestFor(template)
  return { title: m ? `${m.name} · ${BRAND_NAME}` : 'Template' }
}

// Full-page, shareable preview of one template — the whole starter document,
// not a card. The overlay shell inside the gallery is for browsing; this is the
// URL you can send someone.
export default async function TemplateDetailPage({ params }: { params: Promise<{ template: string }> }) {
  const { template } = await params
  const m = manifestFor(template)
  if (!m) notFound()

  return (
    <div className="min-h-screen bg-paper-2">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-line bg-surface px-5 py-2.5">
        <Link href="/preview" className="text-[13px] font-medium text-ink-2 hover:text-ink">
          ← All templates
        </Link>
        <span className="font-display text-[16px] text-ink">{m.name}</span>
        <span className="text-[11.5px] text-ink-3">{m.tagline}</span>
        <Link href={`/login?template=${m.id}`}
          className="ml-auto rounded-md bg-accent px-4 py-2 text-[12.5px] font-semibold text-white">
          Use this template
        </Link>
      </div>

      <p className="mx-auto max-w-[720px] px-6 py-6 text-center text-[13.5px] text-ink-2">
        {m.description}
      </p>

      {/* The real thing, full width — same component tree as the published site. */}
      <div className="border-t border-line">
        <TemplateRender templateKey={m.id} seed={DEMO_SEED} fullHeight />
      </div>
    </div>
  )
}
