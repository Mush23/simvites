// ─────────────────────────────────────────────────────────────────────────
// Tenant resolution — subdomain ↔ site, modelled on vercel/platforms.
//
// Production: sites live at `<slug>.<NEXT_PUBLIC_ROOT_DOMAIN>` via wildcard DNS.
// Local dev:  use lvh.me (resolves *.lvh.me → 127.0.0.1), so a site is at
//             http://<slug>.lvh.me:3000 and the apex is http://lvh.me:3000.
// ─────────────────────────────────────────────────────────────────────────

import { RESERVED_SLUGS } from '@/lib/reserved-slugs'

/** Root domain incl. port in dev, e.g. "lvh.me:3000" or "simvites.co.uk". */
export const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000'

const isLocal = () => ROOT_DOMAIN.includes('localhost') || ROOT_DOMAIN.includes('lvh.me')

/**
 * Hostnames that are NOT tenants (serve the marketing site / app shell).
 *
 * M13: this is the SAME set the onboarding form refuses to hand out — see
 * lib/reserved-slugs.ts. It used to be a second, different list: `mail` and
 * `assets` were reserved here but claimable at signup, so a couple could be
 * given an address whose subdomain silently served the marketing site instead
 * of their wedding, with no error to explain it.
 */
const RESERVED_SUBDOMAINS = RESERVED_SLUGS

/**
 * Extract the tenant subdomain from a request host, or null when the host is
 * the apex / a reserved subdomain (→ marketing site).
 */
export function getSubdomain(host: string | null | undefined): string | null {
  if (!host) return null

  // Strip port for comparison.
  const hostname = host.split(':')[0].toLowerCase()
  const rootHostname = ROOT_DOMAIN.split(':')[0].toLowerCase()

  // Vercel preview deployments (e.g. milestones-git-x.vercel.app) → marketing.
  if (hostname.endsWith('.vercel.app')) return null

  // Exact apex match → no tenant.
  if (hostname === rootHostname) return null

  // Must be a subdomain of the root to count.
  if (!hostname.endsWith(`.${rootHostname}`)) {
    // Fallback for bare localhost during dev.
    if (hostname === 'localhost') return null
    return null
  }

  const sub = hostname.slice(0, hostname.length - rootHostname.length - 1)
  if (!sub || RESERVED_SUBDOMAINS.has(sub)) return null

  // Only the left-most label is the tenant slug.
  return sub.split('.')[0]
}

/** Build the public URL for a tenant site (used in invitations, emails). */
export function siteUrl(slug: string): string {
  return `${isLocal() ? 'http' : 'https'}://${slug}.${ROOT_DOMAIN}`
}

/**
 * Absolute URL on the apex, for guest-facing links that are NOT tenant-scoped
 * — the Save the Date share link lives at /std/<token>.
 *
 * Derived from the configured root domain rather than window.location.origin,
 * which put "localhost:3000/std/…" in the Share box that couples copy and send
 * to their guests. A dev host is not a shareable link.
 */
export function publicUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${isLocal() ? 'http' : 'https'}://${ROOT_DOMAIN}${p}`
}
