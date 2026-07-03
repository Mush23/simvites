import { notFound } from 'next/navigation'
import { Render } from '@puckeditor/core/rsc'
import { getPublishedSnapshot } from '@/lib/public-site'
import { siteConfig, starterDoc } from '@/lib/puck/config'

// Public published site (snapshot only). The proxy rewrites
// <slug>.occasio.events/* here; locally reachable at /s/<slug>.
export default async function PublicSitePage({
  params,
}: {
  params: Promise<{ siteSlug: string }>
}) {
  const { siteSlug } = await params
  const snap = await getPublishedSnapshot(siteSlug)
  if (!snap) notFound()

  const home = snap.pages.find((p) => p.is_home) ?? snap.pages[0]
  const data = home?.puck_data ?? starterDoc

  return (
    <div data-site-root className="min-h-screen bg-paper text-ink">
      <Render config={siteConfig} data={data} metadata={{ events: snap.events }} />
    </div>
  )
}
