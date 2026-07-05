import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { StdCard, type StdData } from '@/components/save-the-date/std-card'
import { formatEventDateTime } from '@/lib/utils'
import { PrintButton } from './print-button'

// Public Save-the-Date page. Read via service-role by the PUBLIC share token;
// only a PUBLISHED save-the-date is shown. No auth, no guest session.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = createAdminClient()
  const { data } = await db.from('save_the_dates').select('names, headline, published').eq('share_token', token).maybeSingle()
  if (!data || !data.published) return { title: 'Save the Date' }
  return { title: `${data.names ?? 'Save the Date'} — ${data.headline}` }
}

export default async function PublicStdPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = createAdminClient()
  const { data: std } = await db
    .from('save_the_dates')
    .select('site_id, headline, names, message, date_text, location, photo_url, palette, event_ids, published')
    .eq('share_token', token)
    .maybeSingle()
  if (!std || !std.published) notFound()

  interface EvRow { id: string; name: string; accent: string | null; starts_at: string | null }
  let events: StdData['events'] = []
  if (std.event_ids?.length) {
    const { data: evs } = await db
      .from('events').select('id, name, accent, starts_at')
      .in('id', std.event_ids).is('archived_at', null)
    // Preserve the couple's chosen order.
    const byId = new Map(((evs ?? []) as EvRow[]).map((e) => [e.id, e]))
    events = (std.event_ids as string[])
      .map((id) => byId.get(id))
      .filter((e): e is EvRow => Boolean(e))
      .map((e) => ({ name: e.name, accent: e.accent, dateText: formatEventDateTime(e.starts_at) ?? null }))
  }

  const data: StdData = {
    headline: std.headline, names: std.names, message: std.message,
    dateText: std.date_text, location: std.location, photoUrl: std.photo_url,
    palette: std.palette, events,
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#EFEAE0] px-4 py-12">
      <div data-print-target className="w-full max-w-[440px]">
        <StdCard data={data} />
      </div>
      <PrintButton />
    </main>
  )
}
