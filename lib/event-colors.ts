// Event identity colours.
//
// Every event dot in the product used to fall back to `var(--accent)` when
// `events.accent` was null — which is most of the time, since nothing in the
// app asks the couple to pick one. So Ceremony wore the same red as Publish
// and the same red as an overdue payment, and the eye could not tell a
// category from an alarm.
//
// The fallback now comes from the categorical --event-* ramp in globals.css.
// It is deterministic on position, so a given event keeps its colour across
// the guest list, the invite matrix, the RSVP cards and the schedule — the
// events spine gets one consistent visual identity everywhere it appears.

/** Number of steps in the --event-* ramp declared in globals.css. */
export const EVENT_RAMP_LENGTH = 8

/**
 * Colour for an event dot.
 *
 * @param accent  the event's own `accent` column, if the couple set one
 * @param index   the event's position in the site's ordered event list
 */
export function eventColor(accent: string | null | undefined, index: number): string {
  if (accent) return accent
  // Modulo keeps long event lists in range; negative/NaN indices fall to step 1.
  const step = Number.isFinite(index) && index >= 0 ? (index % EVENT_RAMP_LENGTH) + 1 : 1
  return `var(--event-${step})`
}

/**
 * Ramp colour by position alone, for places rendering a stand-in event set
 * (template previews, marketing mocks) that have no accent column to read.
 */
export function eventRampColor(index: number): string {
  return eventColor(null, index)
}

/**
 * Resolve colours for a whole event list at the data boundary, keyed by id.
 *
 * Always build this from the site's FULL ordered event list, then look up by
 * id — including on screens that show a filtered subset. Indexing into a
 * filtered list would hand the same event a different colour on every screen,
 * which is precisely the inconsistency the ramp exists to remove.
 */
export function eventColorMap(
  events: readonly { id: string; accent?: string | null }[],
): Map<string, string> {
  return new Map(events.map((e, i) => [e.id, eventColor(e.accent, i)]))
}
