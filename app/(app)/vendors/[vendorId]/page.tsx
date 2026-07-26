import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatPence } from '@/lib/money'
import { formatEventDateTime } from '@/lib/utils'
import { VendorForm } from './vendor-form'
import { EventCoverage } from './event-coverage'

export const metadata = { title: 'Vendor · Occasio' }

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ vendorId: string }>
}) {
  const { vendorId } = await params
  const supabase = await createClient()

  const { data: vendor } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .is('archived_at', null)
    .maybeSingle()
  if (!vendor) notFound()

  const [{ data: events }, { data: coverage }, { data: budgetItems }, { data: tasks }] =
    await Promise.all([
      supabase.from('events').select('id, name, starts_at').eq('site_id', vendor.site_id)
        .is('archived_at', null).order('sort_order'),
      supabase.from('vendor_events').select('event_id').eq('vendor_id', vendorId),
      supabase.from('budget_items').select('id, label, estimated_amount, paid_amount, status')
        .eq('vendor_id', vendorId).is('archived_at', null),
      supabase.from('tasks').select('id, title, status, due_date').eq('vendor_id', vendorId).is('archived_at', null),
    ])

  const covered = new Set((coverage ?? []).map((c) => c.event_id))

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <Link href="/vendors" className="eyebrow mb-3 inline-block text-ink-3 hover:text-accent-ink">← Vendors</Link>
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">{vendor.name}</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-card border border-line bg-surface p-7 shadow-card">
          <VendorForm vendor={vendor} />
        </section>

        <div className="space-y-6">
          {/* Event coverage — the connected graph */}
          <section className="rounded-card border border-line bg-surface p-6 shadow-card">
            <p className="eyebrow mb-3">Covers events</p>
            <EventCoverage
              vendorId={vendorId}
              events={(events ?? []).map((e) => ({
                id: e.id, name: e.name, meta: formatEventDateTime(e.starts_at) ?? 'TBC',
                covered: covered.has(e.id),
              }))}
            />
          </section>

          {/* Linked money + work (connected reads, never copies) */}
          <section className="rounded-card border border-line bg-surface p-6 shadow-card">
            <p className="eyebrow mb-3">Linked budget lines</p>
            {(budgetItems ?? []).length === 0 && <p className="text-sm text-ink-3">None yet — link one from Budget.</p>}
            {(budgetItems ?? []).map((b) => (
              <div key={b.id} className="flex items-baseline justify-between border-b border-line py-1.5 text-sm last:border-0">
                <span className="text-ink">{b.label}</span>
                <span className="text-ink-2">{formatPence(b.paid_amount)} / {formatPence(b.estimated_amount)}</span>
              </div>
            ))}
          </section>

          <section className="rounded-card border border-line bg-surface p-6 shadow-card">
            <p className="eyebrow mb-3">Linked tasks</p>
            {(tasks ?? []).length === 0 && <p className="text-sm text-ink-3">None yet — link one from Tasks.</p>}
            {(tasks ?? []).map((t) => (
              <div key={t.id} className="flex items-baseline justify-between border-b border-line py-1.5 text-sm last:border-0">
                <span className={t.status === 'done' ? 'text-ink-3 line-through' : 'text-ink'}>{t.title}</span>
                {t.due_date && <span className="font-sans text-[10px] uppercase text-ink-3">{t.due_date}</span>}
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
