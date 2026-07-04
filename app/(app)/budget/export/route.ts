import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { toCsv, csvResponse } from '@/lib/csv'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorised', { status: 401 })
  const site = await getPrimarySite()
  if (!site) return new Response('No site', { status: 404 })

  const [{ data: items }, { data: events }, { data: vendors }] = await Promise.all([
    supabase.from('budget_items').select('*').eq('site_id', site.siteId).is('archived_at', null).order('category'),
    supabase.from('events').select('id, name').eq('site_id', site.siteId),
    supabase.from('vendors').select('id, name').eq('site_id', site.siteId),
  ])
  const ev = new Map((events ?? []).map((e) => [e.id, e.name]))
  const vn = new Map((vendors ?? []).map((v) => [v.id, v.name]))
  const p = (n: number | null) => (n == null ? '' : (n / 100).toFixed(2))

  const csv = toCsv(
    ['Category', 'Label', 'Event', 'Vendor', 'Estimated (£)', 'Actual (£)', 'Paid (£)', 'Balance (£)', 'Status', 'Due'],
    (items ?? []).map((i) => [
      i.category, i.label, ev.get(i.event_id) ?? '', vn.get(i.vendor_id) ?? '',
      p(i.estimated_amount), p(i.actual_amount), p(i.paid_amount),
      p(Math.max(0, (i.actual_amount ?? i.estimated_amount ?? 0) - (i.paid_amount ?? 0))),
      i.status, i.due_date ?? '',
    ]),
  )
  return csvResponse('budget.csv', csv)
}
