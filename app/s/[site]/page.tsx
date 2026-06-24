import { notFound } from 'next/navigation'
import { TemplateOne } from '@/components/template-one'
import { resolveSiteBySlug } from '@/lib/sites'

/**
 * Tenant site route. The middleware rewrites `<slug>.simvites.co.uk/*` here.
 * `?g=<token>` carries the guest's opaque invitation token for personalisation.
 */
export default async function TenantSitePage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>
  searchParams: Promise<{ g?: string }>
}) {
  const { site: slug } = await params
  await searchParams // guest token resolution wired in a later sprint

  const resolved = await resolveSiteBySlug(slug)
  if (!resolved) notFound()

  return <TemplateOne site={resolved.site} content={resolved.content} />
}
