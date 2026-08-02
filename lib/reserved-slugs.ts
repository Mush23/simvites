/**
 * Slugs a couple may not claim — ONE list, imported by both the place that
 * hands slugs out (onboarding) and the place that routes them (tenant).
 *
 * M13: these used to be two separate sets that disagreed. Signup blocked
 * `dashboard/login/auth/onboarding/i/s`; the router reserved `mail/assets`.
 * So `mail` and `assets` were claimable but unroutable — the couple got a
 * confirmed address whose subdomain silently served the marketing site
 * instead of their wedding, with no error anywhere to explain it.
 *
 * Anything added here must be added ONCE. If you find yourself writing a
 * second list, you are re-introducing the bug.
 */
export const RESERVED_SLUGS = new Set([
  // Infrastructure subdomains
  'www', 'api', 'app', 'admin', 'mail', 'smtp', 'imap', 'ftp', 'ns', 'mx',
  'cdn', 'assets', 'static', 'media', 'img', 'images', 'files', 'download',
  // Product routes — a slug matching one of these is confusing even when it
  // routes correctly, because the couple will see it in their own URL bar.
  'dashboard', 'login', 'logout', 'signup', 'auth', 'onboarding', 'account',
  'settings', 'billing', 'preview', 'tour', 'std', 'admin-panel', 'invite',
  // Legal + support surfaces
  'privacy', 'terms', 'cookies', 'legal', 'help', 'support', 'contact',
  'status', 'docs', 'blog', 'about', 'pricing', 'security',
  // Single letters already used as path prefixes (/i/<token>, /s/<slug>)
  'i', 's', 'e', 'r',
  // Reserved for future use / commonly abused
  'test', 'staging', 'dev', 'demo', 'internal', 'root', 'system',
])

/** Lowercase, strip anything not a-z0-9-, collapse edges, cap length. */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug)
}
