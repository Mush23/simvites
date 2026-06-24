import type { EventRecord } from '@/lib/types'
import { formatEventDate } from '@/lib/utils'
import { Reveal } from './reveal'
import { SectionHeading } from './section-heading'

/** A weekend-at-a-glance timeline built from each event's schedule_json. */
export function Schedule({ events }: { events: EventRecord[] }) {
  const withSchedule = events
    .filter((e) => e.visible && e.schedule.length > 0)
    .sort((a, b) => a.order - b.order)

  if (withSchedule.length === 0) return null

  return (
    <section id="schedule" className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
      <Reveal>
        <SectionHeading kicker="At a Glance" title="The Weekend" />
      </Reveal>

      <div className="mt-14 space-y-12">
        {withSchedule.map((event) => (
          <Reveal key={event.key} className="relative">
            <div className="mb-4 flex items-baseline justify-between border-b border-border pb-2">
              <h3 className="font-heading text-2xl font-light text-foreground">
                {event.name}
              </h3>
              {event.eventDate && (
                <span className="text-[0.7rem] uppercase tracking-wide-soft text-muted-foreground">
                  {formatEventDate(event.eventDate)}
                </span>
              )}
            </div>
            <ul className="space-y-3">
              {event.schedule.map((item, i) => (
                <li key={i} className="flex gap-5">
                  <span className="w-28 shrink-0 text-sm font-medium text-gold-ink">
                    {item.time}
                  </span>
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
