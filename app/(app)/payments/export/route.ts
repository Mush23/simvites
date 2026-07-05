import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { toCsv, csvResponse } from '@/lib/csv'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorised', { status: 401 })
  const site = await getPrimarySite()
  if (!site) return new Response('No site', { status: 404 })

  const [{ data: payments }, { data: vendors }, { data: items }] = await Promise.all([
    supabase.from('vendor_payments').select('*').eq('site_id', site.siteId).is('archived_at', null).order('due_date'),
    supabase.from('vendors').select('id, name').eq('site_id', site.siteId),
    supabase.from('budget_items').select('id, label').eq('site_id', site.siteId),
  ])
  const vn = new Map((vendors ?? []).map((v) => [v.id, v.name]))
  const bl = new Map((items ?? []).map((i) => [i.id, i.label]))
  const p = (n: number | null) => (n == null ? '' : (n / 100).toFixed(2))
  const today = new Date().toISOString().slice(0, 10)

  const csv = toCsv(
    ['Due date', 'Payment', 'Vendor', 'Budget line', 'Amount (£)', 'Status', 'Paid on', 'Note'],
    (payments ?? []).map((p2) => [
      p2.due_date,
      p2.label,
      vn.get(p2.vendor_id) ?? '',
      bl.get(p2.budget_item_id) ?? '',
      p(p2.amount),
      p2.status === 'paid' ? 'Paid' : p2.due_date < today ? 'Overdue' : 'Scheduled',
      p2.paid_on ?? '',
      p2.note ?? '',
    ]),
  )
  return csvResponse('payment-schedule.csv', csv)
}
