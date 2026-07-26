import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader, StatCard } from '@/components/app/ui'
import { SurfaceTabs, MONEY_TABS } from '@/components/app/surface-tabs'
import { formatPence } from '@/lib/money'
import { BudgetManager, type BudgetItemRow, type Option } from './budget-manager'
import { BudgetImport } from './import-widget'
import { BRAND_NAME } from '@/lib/brand'

export const metadata = { title: `Budget · ${BRAND_NAME}` }

export default async function BudgetPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()

  const [{ data: items }, { data: events }, { data: vendors }] = await Promise.all([
    supabase.from('budget_items').select('*').eq('site_id', site!.siteId)
      .is('archived_at', null).order('category').order('created_at'),
    supabase.from('events').select('id, name').eq('site_id', site!.siteId).is('archived_at', null).order('sort_order'),
    supabase.from('vendors').select('id, name').eq('site_id', site!.siteId).is('archived_at', null).order('name'),
  ])

  const rows = (items ?? []) as BudgetItemRow[]
  const estimated = rows.reduce((n, i) => n + (i.estimated_amount ?? 0), 0)
  const committed = rows.reduce((n, i) => n + (i.actual_amount ?? i.estimated_amount ?? 0), 0)
  const paid = rows.reduce((n, i) => n + (i.paid_amount ?? 0), 0)

  const eventOptions: Option[] = (events ?? []).map((e) => ({ id: e.id, name: e.name }))
  const vendorOptions: Option[] = (vendors ?? []).map((v) => ({ id: v.id, name: v.name }))

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <SurfaceTabs tabs={MONEY_TABS} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          eyebrow="Budget & payments"
          title="Where the money goes"
          description="Every line can link to an event and a vendor — enter once, reuse everywhere."
        />
        <a href="/budget/export" className="rounded-md border border-line bg-paper-2 px-4 py-2 text-sm hover:border-accent">
          Export (CSV)
        </a>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Estimated" value={formatPence(estimated) || '£0.00'} />
        <StatCard label="Committed" value={formatPence(committed) || '£0.00'} hint="actuals where known" />
        <StatCard label="Paid" value={formatPence(paid) || '£0.00'} tone="money"
          bar={committed ? (paid / committed) * 100 : 0} />
        <StatCard label="Left to pay" value={formatPence(Math.max(0, committed - paid)) || '£0.00'} />
      </div>

      <BudgetImport />
      <div className="mt-8">
        <BudgetManager items={rows} events={eventOptions} vendors={vendorOptions} />
      </div>
    </div>
  )
}
