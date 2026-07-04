import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { toCsv, csvResponse } from '@/lib/csv'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorised', { status: 401 })
  const site = await getPrimarySite()
  if (!site) return new Response('No site', { status: 404 })

  const [{ data: tasks }, { data: events }, { data: vendors }] = await Promise.all([
    supabase.from('tasks').select('*').eq('site_id', site.siteId).is('archived_at', null).order('status').order('due_date'),
    supabase.from('events').select('id, name').eq('site_id', site.siteId),
    supabase.from('vendors').select('id, name').eq('site_id', site.siteId),
  ])
  const ev = new Map((events ?? []).map((e) => [e.id, e.name]))
  const vn = new Map((vendors ?? []).map((v) => [v.id, v.name]))

  const csv = toCsv(
    ['Task', 'Status', 'Priority', 'Due', 'Event', 'Vendor'],
    (tasks ?? []).map((t) => [
      t.title, t.status, t.priority, t.due_date ?? '', ev.get(t.event_id) ?? '', vn.get(t.vendor_id) ?? '',
    ]),
  )
  return csvResponse('tasks.csv', csv)
}
