import { notFound } from 'next/navigation'
import { Render } from '@puckeditor/core/rsc'
import { getPublishedSnapshot } from '@/lib/public-site'
import { siteConfig } from '@/lib/puck/config'

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

  return (
    <div data-site-root className="min-h-screen bg-paper text-ink">
      <Render config={siteConfig} data={page.puck_data} metadata={{ events: snap.events }} />
    </div>
  )
}
