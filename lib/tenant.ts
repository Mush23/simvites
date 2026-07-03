// ─────────────────────────────────────────────────────────────────────────
// Tenant resolution — subdomain ↔ site, modelled on vercel/platforms.
//
// Production: sites live at `<slug>.occasio.events` via wildcard DNS.
// Local dev:  use lvh.me (resolves *.lvh.me → 127.0.0.1), so a site is at
//             http://<slug>.lvh.me:3000 and the apex is http://lvh.me:3000.
// ─────────────────────────────────────────────────────────────────────────

/** Root domain incl. port in dev, e.g. "lvh.me:3000" or "occasio.events". */
export const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000'

/** Hostnames that are NOT tenants (serve the marketing site / app shell). */
const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'api', 'admin', 'mail', 'assets'])

/**
 * Extract the tenant subdomain from a request host, or null when the host is
 * the apex / a reserved subdomain (→ marketing site).
 */
export function getSubdomain(host: string | null | undefined): string | null {
  if (!host) return null

  // Strip port for comparison.
  const hostname = host.split(':')[0].toLowerCase()
  const rootHostname = ROOT_DOMAIN.split(':')[0].toLowerCase()

  // Vercel preview deployments (e.g. simvites-git-x.vercel.app) → marketing.
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
  const protocol = ROOT_DOMAIN.includes('localhost') || ROOT_DOMAIN.includes('lvh.me')
    ? 'http'
    : 'https'
  return `${protocol}://${slug}.${ROOT_DOMAIN}`
}
