import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { type SiteData } from '@/lib/puck/config'
import type { SiteEvent } from '@/components/site/blocks'
import { WebsiteEditor, type EditorPage } from './website-editor'

export const metadata = { title: 'Website · Occasio' }

function isEmpty(doc: unknown): boolean {
  const d = doc as SiteData | null
  return !d || !Array.isArray(d.content) || d.content.length === 0
}

export default async function WebsitePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const site = await getPrimarySite()
  const supabase = await createClient()
  const { page: requestedPageId } = await searchParams

  const { data: siteRow } = await supabase
    .from('sites').select('theme').eq('id', site!.siteId).maybeSingle()
  const templateKey = (siteRow?.theme as { template?: string } | null)?.template

  const [{ data: pageRows }, { data: eventRows }] = await Promise.all([
    supabase.from('pages')
      .select('id, title, slug, puck_data, is_home, nav_order, hidden')
      .eq('site_id', site!.siteId)
      .order('is_home', { ascending: false })
      .order('nav_order', { ascending: true }),
    supabase
      .from('events')
      .select('id, name, starts_at, venue_name, address, description, accent')
      .eq('site_id', site!.siteId)
      .is('archived_at', null)
      .order('sort_order', { ascending: true })
      .order('starts_at', { ascending: true }),
  ])

  // ?page=<id> opens that page; anything else falls back to home.
  const pages = pageRows ?? []
  const page = pages.find((p) => p.id === requestedPageId) ?? pages.find((p) => p.is_home) ?? pages[0]
  if (!page) {
    return <div className="p-10 text-ink-2">No home page found for this site.</div>
  }

  const { getTemplate } = await import('@/lib/templates/registry')
  const { siteStyleProps } = await import('@/lib/site-style')
  const template = getTemplate(templateKey)
  // Only the HOME page inherits the template starter — new pages start blank.
  const data: SiteData = isEmpty(page.puck_data)
    ? (page.is_home ? template.starterDoc : { root: { props: {} }, content: [] })
    : (page.puck_data as SiteData)
  const events: SiteEvent[] = (eventRows ?? []) as SiteEvent[]

  const { templateFontClasses } = await import('@/lib/template-fonts')

  return (
    <div className={templateFontClasses}>
      <WebsiteEditor
        key={page.id}
        siteId={site!.siteId}
        siteTitle={site!.title}
        pageId={page.id}
        pages={pages.map((p): EditorPage => ({ id: p.id, title: p.title, slug: p.slug, is_home: p.is_home, hidden: p.hidden }))}
        slug={site!.slug}
        data={data}
        events={events}
        published={site!.status === 'published'}
        templateName={template.name}
        styleProps={siteStyleProps(siteRow?.theme)}
        currentStyle={(siteRow?.theme ?? {}) as import('@/lib/site-style').SiteStyle}
      />
    </div>
  )
}
