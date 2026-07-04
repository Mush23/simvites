import { notFound } from 'next/navigation'
import { Render } from '@puckeditor/core/rsc'
import { getPublishedSnapshot } from '@/lib/public-site'
import { siteConfig } from '@/lib/puck/config'
import { getTemplate } from '@/lib/templates/registry'

// A specific published page (snapshot only).
export default async function PublicPage({
  params,
}: {
  params: Promise<{ siteSlug: string; pageSlug: string }>
}) {
  const { siteSlug, pageSlug } = await params
  const snap = await getPublishedSnapshot(siteSlug)
  if (!snap) notFound()

  const page = snap.pages.find((p) => p.slug === pageSlug && !p.hidden)
  if (!page) notFound()

  const template = getTemplate((snap.theme as { template?: string } | null)?.template)

  return (
    <div data-site-root className="min-h-screen bg-paper text-ink" style={template.vars as React.CSSProperties}>
      <Render config={siteConfig} data={page.puck_data} metadata={{ events: snap.events }} />
    </div>
  )
}
