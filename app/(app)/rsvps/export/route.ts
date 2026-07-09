import { createClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetch-all'
import { getPrimarySite } from '@/lib/workspace'
import { toCsv, csvResponse } from '@/lib/csv'

/**
 * RSVP-by-event CSV: one row per guest × invited event, with status and
 * every question answer as extra columns. This is the sheet a couple hands
 * to their caterer. Auth-gated; RLS scopes rows.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorised', { status: 401 })
  const site = await getPrimarySite()
  if (!site) return new Response('No site', { status: 404 })

  // Every guest × event row must be present — page past the 1000-row cap.
  const [{ data: events }, invitations, responses, guests, households, { data: questions }, answers] =
    await Promise.all([
      supabase.from('events').select('id, name').eq('site_id', site.siteId).is('archived_at', null).order('sort_order'),
      fetchAll<{ guest_id: string; event_id: string }>(() =>
        supabase.from('invitations').select('guest_id, event_id').eq('site_id', site.siteId)),
      fetchAll<{ guest_id: string; event_id: string; status: string; responded_at: string | null }>(() =>
        supabase.from('responses').select('guest_id, event_id, status, responded_at').eq('site_id', site.siteId)),
      fetchAll<{ id: string; full_name: string; household_id: string }>(() =>
        supabase.from('guests').select('id, full_name, household_id').eq('site_id', site.siteId).is('archived_at', null)),
      fetchAll<{ id: string; name: string }>(() =>
        supabase.from('households').select('id, name').eq('site_id', site.siteId)),
      supabase.from('rsvp_questions').select('id, label').eq('site_id', site.siteId).is('archived_at', null).order('sort_order'),
      fetchAll<{ guest_id: string; question_id: string; value: unknown }>(() =>
        supabase.from('rsvp_answers').select('guest_id, question_id, value').eq('site_id', site.siteId)),
    ])

  const evById = new Map((events ?? []).map((e) => [e.id, e.name]))
  const gById = new Map((guests ?? []).map((g) => [g.id, g]))
  const hhById = new Map((households ?? []).map((h) => [h.id, h.name]))
  const respByKey = new Map((responses ?? []).map((r) => [`${r.guest_id}:${r.event_id}`, r]))
  const qList = questions ?? []
  const ansByGuest = new Map<string, Map<string, unknown>>()
  for (const a of answers ?? []) {
    if (!ansByGuest.has(a.guest_id)) ansByGuest.set(a.guest_id, new Map())
    ansByGuest.get(a.guest_id)!.set(a.question_id, a.value)
  }
  const fmt = (v: unknown) =>
    v == null ? '' : Array.isArray(v) ? v.join('; ') : typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v)

  const rows = (invitations ?? [])
    .filter((i) => gById.has(i.guest_id) && evById.has(i.event_id))
    .map((i) => {
      const g = gById.get(i.guest_id)!
      const r = respByKey.get(`${i.guest_id}:${i.event_id}`)
      return [
        evById.get(i.event_id)!,
        hhById.get(g.household_id) ?? '',
        g.full_name,
        r?.status ?? 'pending',
        r?.responded_at ? new Date(r.responded_at).toISOString() : '',
        ...qList.map((q) => fmt(ansByGuest.get(i.guest_id)?.get(q.id))),
      ]
    })
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1])))

  const csv = toCsv(
    ['Event', 'Household', 'Guest', 'Status', 'Responded at', ...qList.map((q) => q.label)],
    rows,
  )
  return csvResponse('rsvps.csv', csv)
}
