import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { formatEventDateTime } from '@/lib/utils'
import { StdEditor, type StdEditorEvent, type StdRecord } from './std-editor'

export const metadata = { title: 'Save the Date · Occasio' }

export default async function SaveTheDatePage() {
  const site = await getPrimarySite()
  const supabase = await createClient()

  const [{ data: std }, { data: events }, { data: siteRow }] = await Promise.all([
    supabase.from('save_the_dates')
      .select('share_token, headline, names, message, date_text, location, photo_url, palette, event_ids, published')
      .eq('site_id', site!.siteId).maybeSingle(),
    supabase.from('events').select('id, name, accent, starts_at')
      .eq('site_id', site!.siteId).is('archived_at', null)
      .order('sort_order').order('starts_at'),
    supabase.from('sites').select('title').eq('id', site!.siteId).maybeSingle(),
  ])

  const evs: StdEditorEvent[] = (events ?? []).map((e) => ({
    id: e.id, name: e.name, accent: e.accent, dateText: formatEventDateTime(e.starts_at) ?? null,
  }))

  const record: StdRecord | null = std
    ? {
        shareToken: std.share_token, headline: std.headline, names: std.names, message: std.message,
        dateText: std.date_text, location: std.location, photoUrl: std.photo_url,
        palette: std.palette, eventIds: std.event_ids ?? [], published: std.published,
      }
    : null

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <PageHeader
        eyebrow="Save the Date"
        title="Announce the weekend"
        description="A shareable pre-invitation. Pick which celebrations to tease, choose a look, and send it by WhatsApp, email, QR or print. The formal invitations come later."
      />
      <StdEditor record={record} events={evs} defaultNames={siteRow?.title ?? ''} />
    </div>
  )
}
