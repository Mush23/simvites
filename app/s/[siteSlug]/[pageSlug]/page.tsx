import { notFound } from 'next/navigation'
import { Render } from '@puckeditor/core/rsc'
import { getPublishedSnapshot } from '@/lib/public-site'
import { siteConfig, docForPage, EMPTY_DOC } from '@/lib/puck/config'
import { siteStyleProps } from '@/lib/site-style'
import { SiteNav } from '@/components/site/site-nav'
import { BackdropFx } from '@/components/site/backdrop-fx'

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

  const styleProps = siteStyleProps(snap.theme)

  return (
    <div data-site-root className="relative min-h-screen bg-paper text-ink" {...styleProps}>
      <BackdropFx theme={snap.theme} />
      <div className="relative z-[1]">
        <SiteNav pages={snap.pages} theme={snap.theme} currentSlug={pageSlug} />
        {/* A sub-page with no content renders blank, never the wedding starter
            (new pages are deliberately created empty) — and never throws. */}
        <Render config={siteConfig} data={docForPage(page.puck_data, false, EMPTY_DOC)}
          metadata={{ events: snap.events }} />
      </div>
    </div>
  )
}
