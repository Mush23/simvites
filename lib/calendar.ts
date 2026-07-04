// Add-to-calendar links — ported behaviour from the wedding site.

export interface CalendarEvent {
  title: string
  startsAt: string // ISO
  endsAt?: string | null
  venue?: string | null
  address?: string | null
}

const fmt = (iso: string) =>
  new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

function endOf(e: CalendarEvent): string {
  if (e.endsAt) return e.endsAt
  const d = new Date(e.startsAt)
  d.setHours(d.getHours() + 3) // sensible default block
  return d.toISOString()
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${fmt(e.startsAt)}/${fmt(endOf(e))}`,
    location: [e.venue, e.address].filter(Boolean).join(', '),
  })
  return `https://calendar.google.com/calendar/render?${p}`
}

/** .ics as a data URL — works for Apple/Outlook without a server round-trip. */
export function icsDataUrl(e: CalendarEvent): string {
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Occasio//EN',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@occasio`,
    `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(e.startsAt)}`,
    `DTEND:${fmt(endOf(e))}`,
    `SUMMARY:${e.title.replace(/([,;])/g, '\\$1')}`,
    `LOCATION:${[e.venue, e.address].filter(Boolean).join(', ').replace(/([,;])/g, '\\$1')}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`
}
