import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatPence } from '@/lib/money'
import { EventForm } from './event-form'

export const metadata = { title: 'Event · Occasio' }

const TABS = ['overview', 'guests', 'rsvp', 'vendors', 'budget', 'tasks', 'files'] as const
type Tab = (typeof TABS)[number]
const TAB_LABEL: Record<Tab, string> = {
  overview: 'Overview', guests: 'Guests', rsvp: 'RSVP', vendors: 'Vendors',
  budget: 'Budget', tasks: 'Tasks', files: 'Files',
}

export default async function EventHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { eventId } = await params
  const { tab: rawTab } = await searchParams
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? '') ? (rawTab as Tab) : 'overview'

  const supabase = await createClient()
  const { data: event } = await supabase
    .from('events')
    .select('id, site_id, name, starts_at, ends_at, rsvp_deadline, venue_name, address, description, dress_code, host_side, visibility, capacity, on_website')
    .eq('id', eventId)
    .is('archived_at', null)
    .maybeSingle()
  if (!event) notFound()

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <Link href="/events" className="eyebrow mb-3 inline-block text-ink-3 hover:text-accent-ink">← Events</Link>
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">{event.name}</h1>

      {/* Connected tab bar — real links, keyboard-reachable */}
      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Event sections">
        {TABS.map((t) => (
          <Link key={t} href={`/events/${eventId}${t === 'overview' ? '' : `?tab=${t}`}`}
            aria-current={tab === t ? 'page' : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              tab === t ? 'border-accent font-medium text-ink' : 'border-transparent text-ink-3 hover:text-ink'
            }`}>
            {TAB_LABEL[t]}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        {tab === 'overview' && (
          <div className="rounded-card border border-line bg-surface p-7 shadow-card">
            <EventForm event={event} />
          </div>
        )}
        {tab !== 'overview' && <ConnectedTab tab={tab} eventId={eventId} siteId={event.site_id} />}
      </div>
    </div>
  )
}

/** Read-only connected views — the same rows the modules own, scoped to this event. */
async function ConnectedTab({ tab, eventId, siteId }: { tab: Tab; eventId: string; siteId: string }) {
  const supabase = await createClient()

  if (tab === 'guests' || tab === 'rsvp') {
    const [{ data: invitations }, { data: guests }, { data: households }, { data: responses }] =
      await Promise.all([
        supabase.from('invitations').select('guest_id').eq('event_id', eventId),
        supabase.from('guests').select('id, full_name, household_id').eq('site_id', siteId).is('archived_at', null),
        supabase.from('households').select('id, name').eq('site_id', siteId),
        supabase.from('responses').select('guest_id, status').eq('event_id', eventId),
      ])
    const gById = new Map((guests ?? []).map((g) => [g.id, g]))
    const hh = new Map((households ?? []).map((h) => [h.id, h.name]))
    const resp = new Map((responses ?? []).map((r) => [r.guest_id, r.status]))
    const invited = (invitations ?? []).map((i) => gById.get(i.guest_id)).filter(Boolean)

    if (tab === 'guests') {
      return (
        <Panel empty={invited.length === 0} emptyText="No one invited to this event yet." manageHref="/guests" manageLabel="Manage invitations">
          {invited.map((g) => (
            <Row key={g!.id} main={g!.full_name} sub={hh.get(g!.household_id) ?? ''} />
          ))}
        </Panel>
      )
    }
    const counts = { attending: 0, declined: 0, pending: 0 }
    for (const g of invited) {
      const s = resp.get(g!.id)
      if (s === 'attending') counts.attending++
      else if (s === 'declined') counts.declined++
      else counts.pending++
    }
    return (
      <div>
        <div className="mb-6 grid max-w-md grid-cols-3 gap-3 text-center">
          {(['attending', 'declined', 'pending'] as const).map((k) => (
            <div key={k} className="rounded-md bg-paper-2 py-3">
              <p className="font-mono text-[22px] font-semibold tracking-tight nums text-ink">{counts[k]}</p>
              <p className="eyebrow mt-1">{k}</p>
            </div>
          ))}
        </div>
        <Panel empty={invited.length === 0} emptyText="No invitations yet." manageHref="/rsvps" manageLabel="Open RSVP dashboard">
          {invited.map((g) => (
            <Row key={g!.id} main={g!.full_name} sub={hh.get(g!.household_id) ?? ''} pill={resp.get(g!.id) ?? 'pending'} />
          ))}
        </Panel>
      </div>
    )
  }

  if (tab === 'vendors') {
    const { data: cover } = await supabase.from('vendor_events').select('vendor_id').eq('event_id', eventId)
    const ids = (cover ?? []).map((c) => c.vendor_id)
    const { data: vendors } = ids.length
      ? await supabase.from('vendors').select('id, name, category, status').in('id', ids).is('archived_at', null)
      : { data: [] }
    return (
      <Panel empty={!vendors?.length} emptyText="No vendors cover this event yet." manageHref="/vendors" manageLabel="Manage vendors">
        {(vendors ?? []).map((v) => (
          <Row key={v.id} href={`/vendors/${v.id}`} main={v.name} sub={v.category} pill={v.status} />
        ))}
      </Panel>
    )
  }

  if (tab === 'budget') {
    const { data: items } = await supabase.from('budget_items')
      .select('id, label, category, estimated_amount, actual_amount, paid_amount')
      .eq('event_id', eventId).is('archived_at', null)
    const total = (items ?? []).reduce((n, i) => n + (i.actual_amount ?? i.estimated_amount ?? 0), 0)
    return (
      <div>
        <p className="mb-4 font-mono text-lg font-semibold nums text-ink">{formatPence(total) || '£0.00'} <span className="text-sm text-ink-3">committed to this event</span></p>
        <Panel empty={!items?.length} emptyText="No budget lines linked to this event." manageHref="/budget" manageLabel="Open budget">
          {(items ?? []).map((i) => (
            <Row key={i.id} main={i.label} sub={i.category}
              trailing={`${formatPence(i.paid_amount)} / ${formatPence(i.actual_amount ?? i.estimated_amount)}`} />
          ))}
        </Panel>
      </div>
    )
  }

  if (tab === 'tasks') {
    const { data: tasks } = await supabase.from('tasks').select('id, title, status, due_date')
      .eq('event_id', eventId).is('archived_at', null).order('status')
    return (
      <Panel empty={!tasks?.length} emptyText="No tasks linked to this event." manageHref="/tasks" manageLabel="Open tasks">
        {(tasks ?? []).map((t) => (
          <Row key={t.id} main={t.title} sub={t.due_date ?? ''} pill={t.status} />
        ))}
      </Panel>
    )
  }

  // files
  const { data: files } = await supabase.from('files').select('id, name, kind')
    .eq('event_id', eventId).order('created_at', { ascending: false })
  return (
    <Panel empty={!files?.length} emptyText="No files linked to this event." manageHref="/files" manageLabel="Open files">
      {(files ?? []).map((f) => (
        <Row key={f.id} href={`/files/${f.id}/download`} main={f.name} sub={f.kind ?? ''} />
      ))}
    </Panel>
  )
}

function Panel({ empty, emptyText, manageHref, manageLabel, children }: {
  empty: boolean; emptyText: string; manageHref: string; manageLabel: string; children?: React.ReactNode
}) {
  return (
    <div>
      {empty ? (
        <div className="rounded-card border border-dashed border-line bg-paper-2 p-8 text-center text-ink-2">{emptyText}</div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
      <Link href={manageHref} className="eyebrow mt-4 inline-block text-accent-ink hover:underline">{manageLabel} →</Link>
    </div>
  )
}

function Row({ main, sub, pill, trailing, href }: {
  main: string; sub?: string; pill?: string; trailing?: string; href?: string
}) {
  const inner = (
    <>
      <div className="min-w-0">
        <p className="text-sm text-ink">{main}</p>
        {sub && <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">{sub}</p>}
      </div>
      <div className="flex items-center gap-3">
        {trailing && <span className="text-sm text-ink-2">{trailing}</span>}
        {pill && (
          <span className="rounded-pill bg-paper-2 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">{pill}</span>
        )}
      </div>
    </>
  )
  const cls = 'flex items-center justify-between rounded-card border border-line bg-surface p-3.5 shadow-card'
  return href ? <Link href={href} className={`${cls} transition-transform hover:-translate-y-0.5`}>{inner}</Link> : <div className={cls}>{inner}</div>
}
