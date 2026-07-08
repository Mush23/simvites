import Link from 'next/link'
import { getGuestRsvpContext } from '@/lib/guest-rsvp'
import { getPublishedSnapshot } from '@/lib/public-site'
import { siteStyleProps } from '@/lib/site-style'
import { createAdminClient } from '@/lib/supabase/server'
import { googleCalendarUrl, icsDataUrl } from '@/lib/calendar'
import { formatEventDateTime } from '@/lib/utils'

// "My schedule" — the guest-facing personal itinerary. Opens from the
// household's invite link (guest-session cookie): only THEIR events, with
// dates, venues, the running order, their table, and add-to-calendar.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params
  const ctx = await getGuestRsvpContext(siteSlug)
  return { title: ctx ? `Your schedule — ${ctx.siteTitle}` : 'Your schedule' }
}

export default async function GuestSchedulePage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params
  const ctx = await getGuestRsvpContext(siteSlug)
  const snap = await getPublishedSnapshot(siteSlug)
  const styleProps = snap ? siteStyleProps(snap.theme) : { style: {}, 'data-glow': 'none', 'data-hover': 'lift', 'data-heading-case': 'normal' }

  if (!ctx) {
    return (
      <div data-site-root className="flex min-h-screen items-center justify-center bg-paper px-6 text-center text-ink" {...styleProps}>
        <div>
          <h1 className="font-display text-3xl">Your schedule lives behind your invitation</h1>
          <p className="mx-auto mt-3 max-w-sm text-ink-2">
            Open the personal link you were sent by the couple — your events, times and table will be right here.
          </p>
        </div>
      </div>
    )
  }

  // Union of the household's invited events, plus rich detail + itinerary.
  const eventIds = [...new Set(ctx.guests.flatMap((g) => g.events.map((e) => e.eventId)))]
  const db = createAdminClient()
  const [{ data: events }, { data: itinerary }] = await Promise.all([
    eventIds.length
      ? db.from('events').select('id, name, starts_at, ends_at, venue_name, address, accent, dress_code')
          .in('id', eventIds).is('archived_at', null).order('starts_at')
      : Promise.resolve({ data: [] }),
    eventIds.length
      ? db.from('event_itinerary').select('event_id, time_label, title, note, sort_order')
          .in('event_id', eventIds).order('sort_order')
      : Promise.resolve({ data: [] }),
  ])

  interface EvRow { id: string; name: string; starts_at: string | null; ends_at: string | null; venue_name: string | null; address: string | null; accent: string | null; dress_code: string | null }
  interface ItinRow { event_id: string; time_label: string | null; title: string; note: string | null }
  const evRows = (events ?? []) as EvRow[]
  const itinByEvent = new Map<string, ItinRow[]>()
  for (const it of (itinerary ?? []) as ItinRow[]) {
    const arr = itinByEvent.get(it.event_id) ?? []
    arr.push(it)
    itinByEvent.set(it.event_id, arr)
  }

  const tableByGuest = ctx.guests.filter((g) => g.tableName).map((g) => ({ name: g.fullName, table: g.tableName! }))

  return (
    <div data-site-root className="min-h-screen bg-paper text-ink" {...styleProps}>
      <main className="mx-auto max-w-2xl px-6 py-14">
        <p className="eyebrow text-center">{ctx.siteTitle}</p>
        <h1 className="mt-3 text-center font-display text-4xl">Your schedule</h1>
        <p className="mt-3 text-center text-ink-2">
          {ctx.householdName} — everything you&rsquo;re invited to, in one place.
        </p>

        {tableByGuest.length > 0 && (
          <div className="mx-auto mt-6 max-w-md rounded-card border border-line bg-surface p-5 text-center shadow-card">
            <p className="eyebrow">Your seats</p>
            <div className="mt-2 space-y-1">
              {tableByGuest.map((t) => (
                <p key={t.name} className="text-sm text-ink-2">
                  <span className="text-ink">{t.name}</span> — {t.table}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 space-y-6">
          {evRows.map((e) => {
            const going = ctx.guests.filter((g) => g.events.some((x) => x.eventId === e.id && x.status === 'attending')).map((g) => g.fullName)
            const pending = ctx.guests.filter((g) => g.events.some((x) => x.eventId === e.id && x.status === 'pending')).map((g) => g.fullName)
            const itin = itinByEvent.get(e.id) ?? []
            return (
              <section key={e.id} className="rounded-card border border-line bg-surface p-6 shadow-card"
                style={{ borderTopColor: e.accent ?? 'var(--accent-line)', borderTopWidth: 3 }}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-2xl">{e.name}</h2>
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent-ink">
                    {formatEventDateTime(e.starts_at) ?? 'Date to follow'}
                  </span>
                </div>
                {(e.venue_name || e.address) && (
                  <p className="mt-1.5 text-ink-2">{[e.venue_name, e.address].filter(Boolean).join(' · ')}</p>
                )}
                {e.dress_code && <p className="mt-1 text-sm text-ink-3">Dress code: {e.dress_code}</p>}

                {itin.length > 0 && (
                  <dl className="mt-4 space-y-2 border-t border-line pt-4">
                    {itin.map((it, i) => (
                      <div key={i} className="flex gap-3">
                        <dt className="w-20 shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] leading-5 text-accent-ink">
                          {it.time_label ?? '·'}
                        </dt>
                        <dd className="text-sm text-ink-2">
                          <span className="text-ink">{it.title}</span>
                          {it.note ? <span className="text-ink-3"> — {it.note}</span> : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4 text-sm">
                  {going.length > 0 && <span className="text-ink-2"><span className="text-ok">Going:</span> {going.join(', ')}</span>}
                  {pending.length > 0 && <span className="text-ink-3">Awaiting reply: {pending.join(', ')}</span>}
                  {e.starts_at && (
                    <span className="ml-auto flex gap-3">
                      <a className="text-accent-ink underline underline-offset-4" target="_blank" rel="noreferrer"
                        href={googleCalendarUrl({ title: `${e.name} — ${ctx.siteTitle}`, startsAt: e.starts_at, endsAt: e.ends_at, venue: e.venue_name, address: e.address })}>
                        Google Calendar
                      </a>
                      <a className="text-accent-ink underline underline-offset-4"
                        download={`${e.name.toLowerCase().replace(/\s+/g, '-')}.ics`}
                        href={icsDataUrl({ title: `${e.name} — ${ctx.siteTitle}`, startsAt: e.starts_at, endsAt: e.ends_at, venue: e.venue_name, address: e.address })}>
                        Apple / Outlook
                      </a>
                    </span>
                  )}
                </div>
              </section>
            )
          })}
          {evRows.length === 0 && (
            <p className="text-center text-ink-3">No events yet — check back once the couple finalises the plan.</p>
          )}
        </div>

        <p className="mt-10 text-center">
          <Link href="/rsvp" className="text-accent-ink underline underline-offset-4">Update your RSVP →</Link>
        </p>
      </main>
    </div>
  )
}
