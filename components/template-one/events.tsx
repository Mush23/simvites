import type { EventRecord } from '@/lib/types'
import { Reveal } from './reveal'
import { SectionHeading } from './section-heading'

function accentVar(token?: string) {
  // Maps a data-driven accent token (e.g. "ev-sangeet") to its CSS variable.
  // Using a CSS var keeps it dynamic-safe (Tailwind can't scan runtime names).
  return token ? `var(--${token})` : 'var(--gold)'
}

function EventCard({ event }: { event: EventRecord }) {
  const accent = accentVar(event.accentToken)
  return (
    <article
      className="group relative overflow-hidden rounded-lg border border-border bg-card p-7 transition-shadow hover:shadow-lg"
      style={{ borderTopColor: accent, borderTopWidth: 3 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-heading text-2xl font-light text-card-foreground">
            {event.name}
          </h3>
          {event.tagline && (
            <p className="mt-1 text-sm text-muted-foreground">{event.tagline}</p>
          )}
        </div>
        {event.palette.length > 0 && (
          <div className="flex shrink-0 -space-x-1.5 pt-1.5" aria-hidden="true">
            {event.palette.map((c, i) => (
              <span
                key={i}
                className="h-4 w-4 rounded-full ring-2 ring-card"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>

      <dl className="mt-5 space-y-2 text-sm">
        {event.eventDate && (
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 text-[0.7rem] uppercase tracking-wide-soft text-gold-ink">
              Date
            </dt>
            <dd className="text-card-foreground">{event.eventDate}</dd>
          </div>
        )}
        {event.venue && (
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 text-[0.7rem] uppercase tracking-wide-soft text-gold-ink">
              Venue
            </dt>
            <dd className="text-card-foreground">
              {event.venue}
              {event.address && (
                <span className="block text-muted-foreground">{event.address}</span>
              )}
            </dd>
          </div>
        )}
        {event.themeLabel && (
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 text-[0.7rem] uppercase tracking-wide-soft text-gold-ink">
              Theme
            </dt>
            <dd className="text-card-foreground">{event.themeLabel}</dd>
          </div>
        )}
      </dl>
    </article>
  )
}

export function Events({ events }: { events: EventRecord[] }) {
  const visible = events
    .filter((e) => e.visible)
    .sort((a, b) => a.order - b.order)

  return (
    <section id="events" className="bg-secondary/40 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionHeading kicker="The Celebrations" title="Events" />
        </Reveal>
        <Reveal className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {visible.map((e) => (
            <EventCard key={e.key} event={e} />
          ))}
        </Reveal>
      </div>
    </section>
  )
}
