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

/**
 * Fold accents to their base letters before stripping.
 *
 * Without this, "Zoë & Arjun" became `zo-arjun` — the ë simply vanished,
 * because it is not in `a-z`. Losing a letter out of someone's name in the
 * address they will print on stationery is not acceptable for a product whose
 * guest lists are full of Zoës, Chloés and Björns. NFD splits a letter into
 * base + combining mark; dropping the marks leaves `zoe-arjun`.
 */
function foldAccents(input: string): string {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** Lowercase, fold accents, strip anything not a-z0-9-, trim edges, cap length. */
export function normalizeSlug(input: string): string {
  return foldAccents(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/**
 * C3: the same rules, applied while the user is still typing.
 *
 * The address field used to keep whatever was typed and let the server rewrite
 * it on submit, so `Priya and Sam!! 2027` silently became `priya-and-sam-2027`
 * — with no preview and no confirmation, for an address couples print on
 * stationery. Now the field shows the real thing as it is typed.
 *
 * Two deliberate differences from the strict version, both about not fighting
 * the keyboard:
 *
 *  - a TRAILING dash survives, so "priya-" is a valid waypoint on the way to
 *    "priya-and-sam" rather than something that deletes itself mid-word
 *  - no `trim()` before substitution, so a typed space becomes the dash the
 *    user obviously meant instead of vanishing and gluing two words together
 *
 * `normalizeSlug` still runs on blur and again on the server, so the trailing
 * dash never survives to the database.
 */
export function normalizeSlugAsTyped(input: string): string {
  return foldAccents(input)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 40)
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug)
}
