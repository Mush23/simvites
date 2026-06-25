import { notFound } from 'next/navigation'
import { Render } from '@puckeditor/core/rsc'
import { resolveSiteBySlug } from '@/lib/sites'
import { puckConfig } from '@/lib/puck/config'
import { ThemeStyle } from '@/components/template-one/theme-style'
import { SiteNav } from '@/components/template-one/site-nav'

/**
 * Public tenant site. The proxy rewrites `<slug>.simvites.co.uk/*` here. We
 * render the published Puck snapshot (RSC) wrapped in the site's theme + nav.
 *
 * Guest personalisation uses the HttpOnly guest-session cookie set by
 * `/i/<token>` (brief §10) — never a `?g=` token in the URL.
 */
export default async function TenantSitePage({
  params,
}: {
  params: Promise<{ site: string }>
}) {
  const { site: slug } = await params
  const resolved = await resolveSiteBySlug(slug)
  if (!resolved) notFound()

  return (
    <div data-site-root className="min-h-screen bg-background text-foreground">
      <ThemeStyle theme={resolved.site.theme} />
      <SiteNav coupleInitials={resolved.coupleInitials} />
      <main>
        <Render
          config={puckConfig}
          data={resolved.pageData}
          metadata={{ events: resolved.site.events }}
        />
      </main>
    </div>
  )
}
