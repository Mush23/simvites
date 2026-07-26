import Image from 'next/image'
import { formatEventDateTime } from '@/lib/utils'
import { BRAND_NAME } from '@/lib/brand'

// Presentational blocks for the public site. Pure + theme-token styled, so the
// same components render in the Puck editor preview and the live snapshot.

export interface SiteEvent {
  id: string
  name: string
  starts_at: string | null
  venue_name: string | null
  address: string | null
  description: string | null
  /** Optional per-event accent colour (any CSS colour) — the wedding-site signature. */
  accent?: string | null
  /** The running order for the day (Save-the-Date/itinerary). */
  itinerary?: { time_label: string | null; title: string; note: string | null }[]
}

/** Overlay depth → black alpha; keeps hero text readable over photos. */
const HERO_OVERLAYS: Record<string, number> = { none: 0, soft: 0.25, balanced: 0.45, deep: 0.65 }

export function SiteHero({
  kicker, title, subtitle, dateText, location, imageUrl, overlay, guestName,
}: {
  kicker?: string; title?: string; subtitle?: string; dateText?: string; location?: string
  /** Plain URL (legacy) or { url, focal } — focal is a CSS object-position from the editor's focus-point picker. */
  imageUrl?: string | { url: string; focal?: string }
  overlay?: 'none' | 'soft' | 'balanced' | 'deep'
  /** Set from the guest-session cookie — "Welcome, The Shah Family". */
  guestName?: string
}) {
  const img = typeof imageUrl === 'string' ? { url: imageUrl, focal: undefined } : imageUrl
  const alpha = HERO_OVERLAYS[overlay ?? 'balanced'] ?? 0.45
  return (
    <section className="relative flex min-h-[72vh] items-center justify-center overflow-hidden bg-paper-2 px-6 py-24 text-center">
      {img?.url && (
        <>
          <Image src={img.url} alt={typeof title === 'string' ? title : ''} fill priority sizes="100vw"
            className="object-cover" style={img.focal ? { objectPosition: img.focal } : undefined} data-hero />
          {alpha > 0 && <div className="absolute inset-0" style={{ background: `rgba(0, 0, 0, ${alpha})` }} />}
        </>
      )}
      <div className={`relative max-w-2xl ${img?.url ? 'text-white' : 'text-ink'}`}>
        {kicker && <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.22em] opacity-90">{kicker}</p>}
        <h1 className="font-display text-5xl leading-[1.02] sm:text-7xl">{title ?? 'Your Names'}</h1>
        {subtitle && <p className="mt-5 text-lg opacity-90">{subtitle}</p>}
        <div className="mt-7 flex items-center justify-center gap-4 font-mono text-[11px] uppercase tracking-[0.18em] opacity-90">
          {dateText && <span>{dateText}</span>}
          {dateText && location && <span className="opacity-50">·</span>}
          {location && <span>{location}</span>}
        </div>
        {guestName && (
          <p className={`mx-auto mt-8 inline-block rounded-pill border px-5 py-2 font-mono text-[10px] uppercase tracking-[0.16em] ${
            img?.url ? 'border-white/40 text-white/90' : 'text-ink-2'
          }`} style={img?.url ? undefined : { borderColor: 'var(--accent-line)' }}>
            Welcome, {guestName}
          </p>
        )}
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
          <div key={e.id} className="rounded-card border border-line bg-surface p-6 shadow-card"
            style={{ borderTopColor: e.accent ?? 'var(--accent-line)', borderTopWidth: 3 }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-2xl text-ink">{e.name}</h3>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-ink">
                {formatEventDateTime(e.starts_at) ?? 'Date TBC'}
              </span>
            </div>
            {e.venue_name && <p className="mt-2 text-ink-2">{e.venue_name}{e.address ? ` · ${e.address}` : ''}</p>}
            {e.description && <p className="mt-2 text-sm text-ink-3">{e.description}</p>}
            {e.itinerary && e.itinerary.length > 0 && (
              <dl className="mt-4 space-y-2 border-t border-line pt-4">
                {e.itinerary.map((it, i) => (
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

export function SiteStory({ kicker, title, paragraphs }: {
  kicker?: string; title?: string; paragraphs: { text: string }[]
}) {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16 text-center">
      {kicker && <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-accent-ink">{kicker}</p>}
      {title && <h2 className="font-display text-4xl text-ink">{title}</h2>}
      <div className="mt-6 space-y-5">
        {(paragraphs ?? []).map((p, i) => (
          <p key={i} className="text-lg leading-relaxed text-ink-2">{p.text}</p>
        ))}
      </div>
    </section>
  )
}

export function SiteFamily({ heading, sides }: {
  heading?: string; sides: { side: string; name: string; parents: string }[]
}) {
  return (
    <section className="border-y border-line bg-paper-2 px-6 py-16">
      {heading && <h2 className="mb-10 text-center font-display text-4xl text-ink">{heading}</h2>}
      <div className="mx-auto grid max-w-2xl gap-8 sm:grid-cols-2">
        {(sides ?? []).map((s, i) => (
          <div key={i} className="text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-ink">{s.side}</p>
            <p className="mt-2 font-display text-3xl text-ink">{s.name}</p>
            <p className="mt-1.5 text-sm text-ink-2">{s.parents}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function SiteHotelTravel({ heading, hotelName, address, blockCode, phone, bookingUrl, notes }: {
  heading?: string; hotelName?: string; address?: string; blockCode?: string
  phone?: string; bookingUrl?: string; notes?: string
}) {
  const rows = [
    blockCode && { label: 'Block code', value: blockCode },
    phone && { label: 'Phone', value: phone },
  ].filter(Boolean) as { label: string; value: string }[]
  const mapsUrl = hotelName
    ? `https://maps.google.com/?q=${encodeURIComponent(`${hotelName} ${address ?? ''}`)}` : null

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h2 className="mb-8 text-center font-display text-4xl text-ink">{heading ?? 'Stay & Travel'}</h2>
      <div className="rounded-card border border-line bg-surface p-7 shadow-card">
        {hotelName ? (
          <>
            <p className="font-display text-2xl text-ink">{hotelName}</p>
            {address && <p className="mt-1 text-ink-2">{address}</p>}
            {rows.length > 0 && (
              <dl className="mt-4 space-y-1.5">
                {rows.map((r) => (
                  <div key={r.label} className="flex gap-3 text-sm">
                    <dt className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] leading-5 text-accent-ink">{r.label}</dt>
                    <dd className="select-all text-ink">{r.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {notes && <p className="mt-4 whitespace-pre-line text-sm text-ink-2">{notes}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              {bookingUrl && (
                <a href={bookingUrl} target="_blank" rel="noreferrer"
                  className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-px">
                  Book a room
                </a>
              )}
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noreferrer"
                  className="rounded-md border border-line px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent-line">
                  Open in Maps
                </a>
              )}
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-ink-3">Hotel details will appear here.</p>
        )}
      </div>
    </section>
  )
}

export function SiteGiftsNote({ heading, body }: { heading?: string; body?: string }) {
  return (
    <section className="px-6 py-16 text-center">
      <div className="mx-auto max-w-xl">
        <div className="mx-auto mb-6 h-px w-16" style={{ background: 'var(--accent-line)' }} />
        <h2 className="font-display text-3xl text-ink">{heading ?? 'Your presence is the present'}</h2>
        {body && <p className="mt-4 leading-relaxed text-ink-2">{body}</p>}
        <div className="mx-auto mt-6 h-px w-16" style={{ background: 'var(--accent-line)' }} />
      </div>
    </section>
  )
}

export function SiteFooter({ names, note }: { names?: string; note?: string }) {
  return (
    <footer className="border-t border-line bg-paper px-6 py-14 text-center">
      <p className="font-display text-3xl text-ink">{names ?? `Made with ${BRAND_NAME}`}</p>
      {note && <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">{note}</p>}
    </footer>
  )
}
