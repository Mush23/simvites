import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { formatEventDateTime } from '@/lib/utils'
import { QuickAddEvent } from './quick-add'
import { BRAND_NAME } from '@/lib/brand'

export const metadata = { title: `Events · ${BRAND_NAME}` }

const VIS_LABEL: Record<string, string> = {
  public: 'Public', invite_only: 'Invite only', hidden: 'Hidden',
}

export default async function EventsPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()
  const { data: events } = await supabase
    .from('events')
    .select('id, name, starts_at, venue_name, visibility, capacity, on_website')
    .eq('site_id', site!.siteId)
    .is('archived_at', null)
    .order('sort_order', { ascending: true })
    .order('starts_at', { ascending: true })

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <PageHeader
        eyebrow="Events"
        title="Your celebrations"
        description="Each event is the spine the whole product reuses — the website schedule, the invite matrix, vendors, budget and tasks all hang off these."
      />

      <QuickAddEvent />

      <ul className="mt-8 space-y-3">
        {(events ?? []).length === 0 && (
          <li className="rounded-card border border-dashed border-line bg-paper-2 p-8 text-center text-ink-2">
            No events yet. Add your first one above.
          </li>
        )}
        {(events ?? []).map((e) => (
          <li key={e.id}>
            <Link
              href={`/events/${e.id}`}
              className="flex items-center justify-between rounded-card border border-line bg-surface p-5 shadow-card transition-colors hover:border-line-2 hover:bg-paper-2"
            >
              <div>
                <p className="text-[15px] font-semibold tracking-tight text-ink">{e.name}</p>
                <p className="mt-1 text-sm text-ink-2">
                  {formatEventDateTime(e.starts_at) ?? 'Date TBC'}
                  {e.venue_name ? ` · ${e.venue_name}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className="rounded-pill bg-paper-2 px-2.5 py-1 font-sans text-[9px] uppercase tracking-[0.14em] text-ink-3">
                  {VIS_LABEL[e.visibility] ?? e.visibility}
                </span>
                {e.capacity != null && (
                  <span className="rounded-pill bg-paper-2 px-2.5 py-1 font-sans text-[9px] uppercase tracking-[0.14em] text-ink-3">
                    cap {e.capacity}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
