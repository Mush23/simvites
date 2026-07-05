import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader, StatCard } from '@/components/app/ui'
import { formatPence } from '@/lib/money'
import { PaymentSchedule, type PaymentRow, type Opt } from './payment-schedule'

export const metadata = { title: 'Payments · Occasio' }

export default async function PaymentsPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()

  const [{ data: payments }, { data: vendors }, { data: budgetItems }] = await Promise.all([
    supabase.from('vendor_payments')
      .select('id, label, amount, due_date, status, paid_on, remind_days_before, vendor_id, budget_item_id, note')
      .eq('site_id', site!.siteId)
      .is('archived_at', null)
      .order('due_date', { ascending: true }),
    supabase.from('vendors').select('id, name').eq('site_id', site!.siteId).is('archived_at', null).order('name'),
    supabase.from('budget_items').select('id, label').eq('site_id', site!.siteId).is('archived_at', null).order('label'),
  ])

  const vendorName = new Map((vendors ?? []).map((v) => [v.id, v.name]))
  const today = new Date().toISOString().slice(0, 10)
  const soon = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)

  const rows: PaymentRow[] = (payments ?? []).map((p) => ({
    id: p.id, label: p.label, amount: p.amount, dueDate: p.due_date,
    status: p.status as 'scheduled' | 'paid', paidOn: p.paid_on,
    vendorId: p.vendor_id, vendorName: p.vendor_id ? vendorName.get(p.vendor_id) ?? null : null,
    budgetItemId: p.budget_item_id, note: p.note,
    overdue: p.status === 'scheduled' && p.due_date < today,
    dueSoon: p.status === 'scheduled' && p.due_date >= today && p.due_date <= soon,
  }))

  const scheduled = rows.filter((r) => r.status === 'scheduled')
  const outstanding = scheduled.reduce((n, r) => n + r.amount, 0)
  const paidTotal = rows.filter((r) => r.status === 'paid').reduce((n, r) => n + r.amount, 0)
  const overdueCount = rows.filter((r) => r.overdue).length
  const dueSoonTotal = rows.filter((r) => r.dueSoon).reduce((n, r) => n + r.amount, 0)

  const vendorOpts: Opt[] = (vendors ?? []).map((v) => ({ id: v.id, name: v.name }))
  const budgetOpts: Opt[] = (budgetItems ?? []).map((b) => ({ id: b.id, name: b.label }))

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <PageHeader
        eyebrow="Payments"
        title="Payment schedule"
        description="Every vendor instalment in one place, so you always know who to pay and when. Marking one paid updates its budget line automatically."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Outstanding" value={formatPence(outstanding) || '£0.00'} hint={`${scheduled.length} scheduled`} />
        <StatCard label="Due in 14 days" value={formatPence(dueSoonTotal) || '£0.00'} hint="plan your transfers" />
        <StatCard label="Overdue" value={overdueCount} hint={overdueCount ? 'needs attention' : 'all on track'} />
        <StatCard label="Paid so far" value={formatPence(paidTotal) || '£0.00'} />
      </div>

      <PaymentSchedule rows={rows} vendors={vendorOpts} budgetItems={budgetOpts} />
    </div>
  )
}
