import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { toCsv, csvResponse } from '@/lib/csv'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorised', { status: 401 })
  const site = await getPrimarySite()
  if (!site) return new Response('No site', { status: 404 })

  const [{ data: vendors }, { data: cover }, { data: events }] = await Promise.all([
    supabase.from('vendors').select('*').eq('site_id', site.siteId).is('archived_at', null).order('status'),
    supabase.from('vendor_events').select('vendor_id, event_id'),
    supabase.from('events').select('id, name').eq('site_id', site.siteId),
  ])
  const ev = new Map((events ?? []).map((e) => [e.id, e.name]))
  const p = (n: number | null) => (n == null ? '' : (n / 100).toFixed(2))

  const csv = toCsv(
    ['Vendor', 'Category', 'Status', 'Quote (£)', 'Contracted (£)', 'Contact', 'Email', 'Phone', 'Covers events'],
    (vendors ?? []).map((v) => [
      v.name, v.category, v.status, p(v.quote_amount), p(v.contracted_amount),
      v.contact_name ?? '', v.email ?? '', v.phone ?? '',
      (cover ?? []).filter((c) => c.vendor_id === v.id).map((c) => ev.get(c.event_id)).filter(Boolean).join('; '),
    ]),
  )
  return csvResponse('vendors.csv', csv)
}
