import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EventForm } from './event-form'

export const metadata = { title: 'Event · Occasio' }

const TABS = ['Overview', 'Guests', 'RSVP', 'Vendors', 'Budget', 'Tasks', 'Files']

export default async function EventHubPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: event } = await supabase
    .from('events')
    .select('id, name, starts_at, ends_at, venue_name, address, description, dress_code, host_side, visibility, capacity, on_website')
    .eq('id', eventId)
    .is('archived_at', null)
    .maybeSingle()
  if (!event) notFound()

  return (
    <div className="mx-auto max-w-[1060px] px-6 py-10">
      <Link href="/events" className="eyebrow mb-3 inline-block text-ink-3 hover:text-accent-ink">
        ← Events
      </Link>
      <h1 className="font-display text-4xl text-ink">{event.name}</h1>

      {/* Event Hub tab bar — Overview live; connected tabs arrive in 1C/1D. */}
      <div className="mt-6 flex gap-1 border-b border-line">
        {TABS.map((t, i) => (
          <span
            key={t}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              i === 0 ? 'border-accent font-medium text-ink' : 'border-transparent text-ink-3'
            }`}
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mt-8 rounded-card border border-line bg-surface p-7 shadow-card">
        <EventForm event={event} />
      </div>
    </div>
  )
}
