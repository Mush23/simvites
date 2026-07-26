import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { SurfaceTabs, VENDOR_TABS } from '@/components/app/surface-tabs'
import { FileManager, type FileRow, type Option } from './file-manager'
import { BRAND_NAME } from '@/lib/brand'

export const metadata = { title: `Files · ${BRAND_NAME}` }

export default async function FilesPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()

  const [{ data: files }, { data: events }, { data: vendors }] = await Promise.all([
    supabase.from('files').select('id, name, kind, event_id, vendor_id, created_at')
      .eq('site_id', site!.siteId).order('created_at', { ascending: false }),
    supabase.from('events').select('id, name').eq('site_id', site!.siteId).is('archived_at', null).order('sort_order'),
    supabase.from('vendors').select('id, name').eq('site_id', site!.siteId).is('archived_at', null).order('name'),
  ])

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <SurfaceTabs tabs={VENDOR_TABS} />
      <PageHeader
        eyebrow="Vendors"
        title="Contracts & documents"
        description="Stored privately; downloads use short-lived signed links. Link each file to its event or vendor."
      />

      {/* V2: teach on first visit — what belongs here and why it pays off */}
      {(files ?? []).length === 0 && (
        <div className="mb-6 rounded-card border border-line bg-surface p-6 shadow-card">
          <p className="text-[14px] font-semibold text-ink">One safe home for the paperwork</p>
          <p className="mt-1 text-[13px] text-ink-3">
            Upload below, link each file to its vendor or event, and it&apos;s findable from their pages too.
            Couples usually keep:
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['📄', 'Vendor contracts', 'The signed terms — attached to the vendor.'],
              ['💷', 'Quotes & invoices', 'Every figure, next to its budget line.'],
              ['🗺️', 'Venue floor plans', 'Feed the seating planner from here.'],
              ['✨', 'Inspiration & briefs', 'Mood boards your decorator will love.'],
            ].map(([icon, t, d]) => (
              <div key={t} className="rounded-[10px] border border-line bg-paper p-3.5">
                <p className="text-[18px]">{icon}</p>
                <p className="mt-1 text-[12.5px] font-semibold text-ink">{t}</p>
                <p className="text-[11.5px] leading-snug text-ink-3">{d}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <FileManager
        files={(files ?? []) as FileRow[]}
        events={(events ?? []) as Option[]}
        vendors={(vendors ?? []) as Option[]}
      />
    </div>
  )
}
