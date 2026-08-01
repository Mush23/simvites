/**
 * HTML escaping for the places React is not doing it for us — chiefly email
 * templates, which are built by string concatenation.
 *
 * M5: `siteName` and `householdName` used to be interpolated raw into the
 * invitation template, and there was no escaping helper anywhere in the
 * codebase to reach for. A household name of
 * `</p><a href="https://phish.tld">Confirm your card…</a><p>` rendered as
 * markup — arbitrary HTML delivered to arbitrary addresses from a domain
 * carrying our SPF and DKIM, so the reputation cost landed on us.
 *
 * Escape at the point of interpolation, never at the point of storage: the
 * data is legitimately arbitrary text and is only dangerous in this context.
 *
 * Deliberately dependency-free so it can be unit-tested without the bundler's
 * path aliases (scripts/test-misuse.mjs).
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;') // must be first, or later escapes get double-encoded
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
