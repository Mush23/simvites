import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { starterDoc, type SiteData } from '@/lib/puck/config'
import type { SiteEvent } from '@/components/site/blocks'
import { WebsiteEditor } from './website-editor'

export const metadata = { title: 'Website · Occasio' }

function isEmpty(doc: unknown): boolean {
  const d = doc as SiteData | null
  return !d || !Array.isArray(d.content) || d.content.length === 0
}

export default async function WebsitePage() {
  const site = await getPrimarySite()
  const supabase = await createClient()

  const [{ data: page }, { data: eventRows }] = await Promise.all([
    supabase.from('pages').select('id, puck_data').eq('site_id', site!.siteId).eq('is_home', true).maybeSingle(),
    supabase
      .from('events')
      .select('id, name, starts_at, venue_name, address, description')
      .eq('site_id', site!.siteId)
      .is('archived_at', null)
      .order('sort_order', { ascending: true })
      .order('starts_at', { ascending: true }),
  ])

  // Fallback: create_org_and_site always makes a home page; guard anyway.
  const pageId = page?.id
  if (!pageId) {
    return <div className="p-10 text-ink-2">No home page found for this site.</div>
  }

  const data: SiteData = isEmpty(page?.puck_data) ? starterDoc : (page!.puck_data as SiteData)
  const events: SiteEvent[] = (eventRows ?? []) as SiteEvent[]

  return (
    <WebsiteEditor
      siteId={site!.siteId}
      pageId={pageId}
      slug={site!.slug}
      data={data}
      events={events}
      published={site!.status === 'published'}
    />
  )
}
