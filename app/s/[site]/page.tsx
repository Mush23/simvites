import { notFound } from 'next/navigation'
import { TemplateOne } from '@/components/template-one'
import { resolveSiteBySlug } from '@/lib/sites'

/**
 * Tenant site route. The proxy rewrites `<slug>.simvites.co.uk/*` here.
 *
 * Guest personalisation does NOT use a `?g=` token (brief §10 security): the
 * public entry route `/i/<token>` validates a hashed token server-side, sets an
 * HttpOnly guest-session cookie, then redirects to the clean URL. This page
 * later reads that cookie to resolve the household — no token in the URL.
 */
export default async function TenantSitePage({
  params,
}: {
  params: Promise<{ site: string }>
}) {
  const { site: slug } = await params

  const resolved = await resolveSiteBySlug(slug)
  if (!resolved) notFound()

  return <TemplateOne site={resolved.site} content={resolved.content} />
}
