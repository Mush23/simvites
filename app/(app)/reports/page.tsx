import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader, StatCard } from '@/components/app/ui'
import { formatPence } from '@/lib/money'
import { Users, ClipboardCheck, Wallet, CalendarClock, Store, ListChecks } from 'lucide-react'

export const metadata = { title: 'Reports · Occasio' }

// V2: a real reports hub — live numbers up top, then exports that say
// exactly how many rows are waiting inside them.
export default async function ReportsPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()
  const siteId = site!.siteId

  const [
    { count: guests }, { count: responses }, { count: attending },
    { count: budgetLines }, { count: payments }, { count: vendors }, { count: tasks },
    { data: budget },
  ] = await Promise.all([
    supabase.from('guests').select('id', { count: 'exact', head: true }).eq('site_id', siteId).is('archived_at', null),
    supabase.from('responses').select('id', { count: 'exact', head: true }).eq('site_id', siteId),
    supabase.from('responses').select('id', { count: 'exact', head: true }).eq('site_id', siteId).eq('status', 'attending'),
    supabase.from('budget_items').select('id', { count: 'exact', head: true }).eq('site_id', siteId).is('archived_at', null),
    supabase.from('vendor_payments').select('id', { count: 'exact', head: true }).eq('site_id', siteId).is('archived_at', null),
    supabase.from('vendors').select('id', { count: 'exact', head: true }).eq('site_id', siteId).is('archived_at', null),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('site_id', siteId).is('archived_at', null),
    supabase.from('budget_items').select('estimated_amount, actual_amount, paid_amount').eq('site_id', siteId).is('archived_at', null),
  ])

  const estTotal = (budget ?? []).reduce((n, b) => n + (b.actual_amount ?? b.estimated_amount ?? 0), 0)
  const paidTotal = (budget ?? []).reduce((n, b) => n + (b.paid_amount ?? 0), 0)

  const REPORTS = [
    { href: '/guests/export', icon: Users, rows: guests ?? 0, title: 'Guest list', body: 'Every household and guest, with emails, children and plus-ones.' },
    { href: '/rsvps/export', icon: ClipboardCheck, rows: responses ?? 0, title: 'RSVPs by event', body: 'Guest × event × status, with a column for every question — the caterer sheet.' },
    { href: '/budget/export', icon: Wallet, rows: budgetLines ?? 0, title: 'Budget', body: 'Every line with estimate, actual, paid and balance, linked to events and vendors.' },
    { href: '/payments/export', icon: CalendarClock, rows: payments ?? 0, title: 'Payment schedule', body: 'Every vendor instalment with due date, amount, status and linked budget line.' },
    { href: '/vendors/export', icon: Store, rows: vendors ?? 0, title: 'Vendors', body: 'The full pipeline with quotes, contracts, contacts and event coverage.' },
    { href: '/tasks/export', icon: ListChecks, rows: tasks ?? 0, title: 'Tasks', body: 'The whole checklist with status, priority, due dates and links.' },
  ]

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <PageHeader
        eyebrow="Reports"
        title="The numbers, live"
        description="Today's picture at a glance — then one-click CSVs to open in Excel or hand straight to a vendor."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Guests" value={guests ?? 0} />
        <StatCard label="Attending" value={attending ?? 0} hint={`${responses ?? 0} responses in`} />
        <StatCard label="Budget" value={formatPence(estTotal)} hint={`${formatPence(paidTotal)} paid`} />
        <StatCard label="Open items" value={`${tasks ?? 0} tasks`} hint={`${payments ?? 0} payments scheduled`} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <a key={r.href} href={r.href}
            className="group rounded-card border border-line bg-surface p-6 shadow-card transition-colors hover:border-accent-line">
            <div className="flex items-start justify-between gap-3">
              <r.icon size={18} strokeWidth={1.7} className="text-ink-3 transition-colors group-hover:text-accent-ink" />
              <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-ink-3">
                {r.rows} row{r.rows === 1 ? '' : 's'}
              </span>
            </div>
            <p className="mt-3 text-[15px] font-semibold tracking-tight text-ink">{r.title}</p>
            <p className="mt-1.5 text-sm text-ink-2">{r.body}</p>
            <p className="mt-4 text-[12.5px] font-medium text-accent-ink">Download CSV →</p>
          </a>
        ))}
      </div>
    </div>
  )
}
