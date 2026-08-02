/**
 * How long a published wedding site stays online.
 *
 * ── The rule ─────────────────────────────────────────────────────────────
 *   18 months after the wedding — measured from the LAST event, floored so
 *   nobody ever gets less than 18 months from the day they publish.
 *
 * ── Why it changed (readiness #5a) ───────────────────────────────────────
 * The marketing site has always promised "18 months after the wedding", in
 * three places including the pricing section. The code gave 18 months from
 * FIRST PUBLISH. For the normal case — a save-the-date published 12–18 months
 * ahead — that is roughly four months after the wedding, not eighteen. It was
 * a pricing claim on the page where people decide to pay, so the promise won
 * and the code moved.
 *
 * ── Why the last event, not the first ────────────────────────────────────
 * This is a multi-event product. A mehndi on Friday and a reception on Sunday
 * are one wedding; the clock starts when the whole celebration is over.
 *
 * ── Why no upper cap ─────────────────────────────────────────────────────
 * A cap sounds prudent and breaks the exact case it is meant to cover: cap at
 * 36 months from publish and a three-year engagement expires ON the wedding
 * day. A promise with an asterisk is also worse marketing than a simple one.
 * Long engagements are rare, static hosting is cheap, and platform admin can
 * already archive or extend any individual site.
 *
 * ── Never shortens ───────────────────────────────────────────────────────
 * Callers take the LATER of the stored date and this one, so recomputing on
 * every publish picks up a moved wedding date without ever revoking hosting a
 * couple has already been granted — including a manual extension from admin.
 */

export const HOSTING_MONTHS_AFTER_WEDDING = 18

function addMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime())
  d.setMonth(d.getMonth() + months)
  return d
}

/**
 * @param lastEventAt  End of the celebration — the latest event start, or null
 *                     when the couple has not dated anything yet.
 * @param publishedAt  When this publish is happening.
 */
export function computeSiteExpiry(lastEventAt: Date | null, publishedAt: Date): Date {
  const floor = addMonths(publishedAt, HOSTING_MONTHS_AFTER_WEDDING)
  if (!lastEventAt || Number.isNaN(lastEventAt.getTime())) return floor
  const afterWedding = addMonths(lastEventAt, HOSTING_MONTHS_AFTER_WEDDING)
  // A wedding already past (or imminent) must still leave a full term from
  // today — otherwise publishing your thank-you page buys you nothing.
  return afterWedding > floor ? afterWedding : floor
}

/** The later of two dates, tolerating a null/invalid stored value. */
export function laterOf(stored: string | null | undefined, computed: Date): Date {
  if (!stored) return computed
  const s = new Date(stored)
  if (Number.isNaN(s.getTime())) return computed
  return s > computed ? s : computed
}
