import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Render } from '@puckeditor/core/rsc'
import { getPublishedSnapshot } from '@/lib/public-site'
import { siteConfig, docForPage } from '@/lib/puck/config'
import { siteStyleProps } from '@/lib/site-style'
import { GUEST_COOKIE, verifyGuestSession } from '@/lib/guest-session'
import { createAdminClient } from '@/lib/supabase/server'
import { SiteNav } from '@/components/site/site-nav'
import { BackdropFx } from '@/components/site/backdrop-fx'

// Share-friendly metadata: the couple's names + an invitation line, so
// WhatsApp/iMessage previews read like an invitation, not a URL.
export async function generateMetadata({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params
  const snap = await getPublishedSnapshot(siteSlug)
  if (!snap) return { title: 'Wedding' }
  return {
    title: `${snap.title} — you're invited`,
    description: 'All the celebrations, details and RSVP in one place.',
    openGraph: {
      title: `${snap.title} — you're invited`,
      description: 'All the celebrations, details and RSVP in one place.',
      type: 'website',
    },
  }
}

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

  const styleProps = siteStyleProps(snap.theme)
  const home = snap.pages.find((p) => p.is_home) ?? snap.pages[0]
  // Normalised, not null-checked: stored `{}` is not nullish, and Render throws
  // on a document with no content array. The starter also comes from the site's
  // OWN template, which is what the editor shows for the same row — the generic
  // starterDoc diverged for every template except the default.
  const { getTemplate } = await import('@/lib/templates/registry')
  const template = getTemplate((snap.theme as { template?: string } | null)?.template)
  const data = docForPage(home?.puck_data, Boolean(home?.is_home), template.starterDoc, `site:${siteSlug}`)

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
    <div data-site-root className="relative min-h-screen bg-paper text-ink" {...styleProps}>
      <BackdropFx theme={snap.theme} />
      <div className="relative z-[1]">
        <SiteNav pages={snap.pages} theme={snap.theme} />
        <Render config={siteConfig} data={data} metadata={{ events: snap.events, guestName }} />
      </div>
    </div>
  )
}
