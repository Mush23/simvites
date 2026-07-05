import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { formatPence } from '@/lib/money'
import { QuickAddVendor } from './quick-add'
import { VendorImport } from './import-widget'

export const metadata = { title: 'Vendors · Occasio' }

const PIPELINE = ['shortlisted', 'contacted', 'quote_in', 'booked', 'declined'] as const
const STATUS_LABEL: Record<string, string> = {
  shortlisted: 'Shortlisted', contacted: 'Contacted', quote_in: 'Quote in', booked: 'Booked', declined: 'Declined',
}
const STATUS_TONE: Record<string, string> = {
  shortlisted: 'bg-paper-2 text-ink-3',
  contacted: 'bg-info-soft text-info',
  quote_in: 'bg-warn-soft text-warn',
  booked: 'bg-ok-soft text-ok',
  declined: 'bg-bad-soft text-bad',
}

export default async function VendorsPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, category, status, quote_amount, contracted_amount')
    .eq('site_id', site!.siteId)
    .is('archived_at', null)
    .order('created_at')

  const booked = (vendors ?? []).filter((v) => v.status === 'booked')
  const contractedTotal = booked.reduce((n, v) => n + (v.contracted_amount ?? v.quote_amount ?? 0), 0)

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <PageHeader
        eyebrow="Vendors"
        title="Supplier pipeline"
        description={`${booked.length} booked · ${formatPence(contractedTotal) || '£0.00'} contracted. A booked vendor flows straight into your budget and dashboard.`}
      />

      <QuickAddVendor />
      <VendorImport />

      <div className="mt-8 space-y-8">
        {PIPELINE.map((stage) => {
          const inStage = (vendors ?? []).filter((v) => v.status === stage)
          if (!inStage.length) return null
          return (
            <section key={stage}>
              <p className="eyebrow mb-3">{STATUS_LABEL[stage]} · {inStage.length}</p>
              <ul className="space-y-2.5">
                {inStage.map((v) => (
                  <li key={v.id}>
                    <Link href={`/vendors/${v.id}`}
                      className="flex items-center justify-between rounded-card border border-line bg-surface p-4 shadow-card transition-transform hover:-translate-y-0.5">
                      <div>
                        <p className="font-medium text-ink">{v.name}</p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{v.category}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {(v.contracted_amount ?? v.quote_amount) != null && (
                          <span className="font-mono text-[15px] font-semibold nums text-ink">
                            {formatPence(v.contracted_amount ?? v.quote_amount)}
                          </span>
                        )}
                        <span className={`rounded-pill px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] ${STATUS_TONE[v.status]}`}>
                          {STATUS_LABEL[v.status]}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
        {(vendors ?? []).length === 0 && (
          <div className="rounded-card border border-dashed border-line bg-paper-2 p-10 text-center text-ink-2">
            No vendors yet — add your first supplier above.
          </div>
        )}
      </div>
    </div>
  )
}
