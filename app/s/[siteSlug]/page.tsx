import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Render } from '@puckeditor/core/rsc'
import { getPublishedSnapshot } from '@/lib/public-site'
import { siteConfig, starterDoc } from '@/lib/puck/config'
import { getTemplate } from '@/lib/templates/registry'
import { GUEST_COOKIE, verifyGuestSession } from '@/lib/guest-session'
import { createAdminClient } from '@/lib/supabase/server'

// Public published site (snapshot only), rendered under the site's TEMPLATE
// theme — CSS-variable overrides at [data-site-root], so the same block
// library serves every template.
export default async function PublicSitePage({
  params,
}: {
  params: Promise<{ siteSlug: string }>
}) {
  const { siteSlug } = await params
  const snap = await getPublishedSnapshot(siteSlug)
  if (!snap) notFound()

  const template = getTemplate((snap.theme as { template?: string } | null)?.template)
  const home = snap.pages.find((p) => p.is_home) ?? snap.pages[0]
  const data = home?.puck_data ?? starterDoc

  // Personalised greeting: if this visitor followed their invite link, greet
  // their household by name (cookie → household, server-side only).
  let guestName: string | undefined
  const session = verifyGuestSession((await cookies()).get(GUEST_COOKIE)?.value)
  if (session) {
    const db = createAdminClient()
    const { data: hh } = await db.from('households')
      .select('name, site_id').eq('id', session.householdId).maybeSingle()
    if (hh && hh.site_id === session.siteId) guestName = hh.name
  }

  return (
    <div data-site-root className="min-h-screen bg-paper text-ink" style={template.vars as React.CSSProperties}>
      <Render config={siteConfig} data={data} metadata={{ events: snap.events, guestName }} />
    </div>
  )
}
