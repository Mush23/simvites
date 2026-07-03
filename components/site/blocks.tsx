import Image from 'next/image'
import { formatEventDateTime } from '@/lib/utils'

// Presentational blocks for the public site. Pure + theme-token styled, so the
// same components render in the Puck editor preview and the live snapshot.

export interface SiteEvent {
  id: string
  name: string
  starts_at: string | null
  venue_name: string | null
  address: string | null
  description: string | null
}

export function SiteHero({
  kicker, title, subtitle, dateText, location, imageUrl,
}: {
  kicker?: string; title?: string; subtitle?: string; dateText?: string; location?: string; imageUrl?: string
}) {
  return (
    <section className="relative flex min-h-[72vh] items-center justify-center overflow-hidden bg-paper-2 px-6 py-24 text-center">
      {imageUrl && (
        <>
          <Image src={imageUrl} alt={title ?? ''} fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-black/45" />
        </>
      )}
      <div className={`relative max-w-2xl ${imageUrl ? 'text-white' : 'text-ink'}`}>
        {kicker && <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.22em] opacity-90">{kicker}</p>}
        <h1 className="font-display text-5xl leading-[1.02] sm:text-7xl">{title ?? 'Your Names'}</h1>
        {subtitle && <p className="mt-5 text-lg opacity-90">{subtitle}</p>}
        <div className="mt-7 flex items-center justify-center gap-4 font-mono text-[11px] uppercase tracking-[0.18em] opacity-90">
          {dateText && <span>{dateText}</span>}
          {dateText && location && <span className="opacity-50">·</span>}
          {location && <span>{location}</span>}
        </div>
      </div>
    </section>
  )
}

export function SiteSchedule({ heading, events }: { heading?: string; events: SiteEvent[] }) {
  const visible = events.filter(Boolean)
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h2 className="mb-10 text-center font-display text-4xl text-ink">{heading ?? 'The Celebrations'}</h2>
      <div className="space-y-4">
        {visible.length === 0 && <p className="text-center text-ink-3">Events will appear here.</p>}
        {visible.map((e) => (
          <div key={e.id} className="rounded-card border border-line bg-surface p-6 shadow-card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-2xl text-ink">{e.name}</h3>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-ink">
                {formatEventDateTime(e.starts_at) ?? 'Date TBC'}
              </span>
            </div>
            {e.venue_name && <p className="mt-2 text-ink-2">{e.venue_name}{e.address ? ` · ${e.address}` : ''}</p>}
            {e.description && <p className="mt-2 text-sm text-ink-3">{e.description}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}

export function SiteEventDetail({ title, body, meta }: { title?: string; body?: string; meta?: string }) {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h2 className="font-display text-4xl text-ink">{title ?? 'Event'}</h2>
      {meta && <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-ink">{meta}</p>}
      {body && <p className="mt-5 text-lg leading-relaxed text-ink-2">{body}</p>}
    </section>
  )
}

export function SiteRsvpCta({ heading, body, buttonText }: { heading?: string; body?: string; buttonText?: string }) {
  return (
    <section className="bg-paper-2 px-6 py-20 text-center">
      <h2 className="font-display text-4xl text-ink">{heading ?? 'Kindly RSVP'}</h2>
      {body && <p className="mx-auto mt-4 max-w-xl text-ink-2">{body}</p>}
      <a
        href="/rsvp"
        className="mt-8 inline-block rounded-md bg-accent px-8 py-3 font-semibold text-white transition-transform hover:-translate-y-px"
      >
        {buttonText ?? 'Open your invitation'}
      </a>
    </section>
  )
}

export function SiteTravel({ heading, body }: { heading?: string; body?: string }) {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h2 className="mb-4 text-center font-display text-4xl text-ink">{heading ?? 'Travel & Stay'}</h2>
      <p className="whitespace-pre-line text-center text-ink-2">{body ?? ''}</p>
    </section>
  )
}

export function SiteFaq({ heading, items }: { heading?: string; items?: { q: string; a: string }[] }) {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h2 className="mb-8 text-center font-display text-4xl text-ink">{heading ?? 'Questions'}</h2>
      <div className="space-y-5">
        {(items ?? []).map((it, i) => (
          <div key={i} className="border-b border-line pb-5">
            <p className="font-display text-xl text-ink">{it.q}</p>
            <p className="mt-1 text-ink-2">{it.a}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function SiteFooter({ names, note }: { names?: string; note?: string }) {
  return (
    <footer className="border-t border-line bg-paper px-6 py-14 text-center">
      <p className="font-display text-3xl text-ink">{names ?? 'Made with Occasio'}</p>
      {note && <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">{note}</p>}
    </footer>
  )
}
