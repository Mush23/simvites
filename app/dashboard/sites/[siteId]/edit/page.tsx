import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { editorialLuxeDoc, isEmptyDoc } from '@/lib/puck/default-content'
import type { SimvitesData } from '@/lib/puck/config'
import type { EventRecord } from '@/lib/types'
import { SiteEditor } from './site-editor'

export const metadata = { title: 'Edit site · Simvites' }

export default async function EditSitePage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  await requireUser()
  const { siteId } = await params
  const supabase = await createClient()

  // RLS ensures the user can only read sites in their org.
  const { data: site } = await supabase
    .from('sites')
    .select('id, name, slug, status')
    .eq('id', siteId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!site) notFound()

  const [{ data: page }, { data: eventRows }] = await Promise.all([
    supabase.from('pages').select('content_json').eq('site_id', siteId).eq('path', '/').maybeSingle(),
    supabase.from('events').select('*').eq('site_id', siteId).is('deleted_at', null).order('order'),
  ])

  const doc: SimvitesData = isEmptyDoc(page?.content_json)
    ? editorialLuxeDoc
    : (page!.content_json as SimvitesData)

  const events: EventRecord[] = (eventRows ?? []).map((e: Record<string, unknown>) => ({
    id: e.id as string,
    key: e.key as string,
    name: e.name as string,
    tagline: (e.tagline as string) ?? undefined,
    eventDate: (e.event_date as string) ?? undefined,
    startTime: (e.start_time as string) ?? undefined,
    durationHours: (e.duration_hours as number) ?? undefined,
    venue: (e.venue as string) ?? undefined,
    address: (e.address as string) ?? undefined,
    themeLabel: (e.theme_label as string) ?? undefined,
    palette: (e.palette as string[]) ?? [],
    accentToken: (e.accent_token as string) ?? undefined,
    coverImage: (e.cover_image as string) ?? undefined,
    schedule: (e.schedule_json as { time: string; label: string }[]) ?? [],
    order: (e.order as number) ?? 0,
    visible: (e.visible as boolean) ?? true,
  }))

  return (
    <SiteEditor
      siteId={site.id}
      siteName={site.name}
      slug={site.slug}
      status={site.status}
      data={doc}
      events={events}
    />
  )
}
