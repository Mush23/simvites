/**
 * Shared constants for the collaborator invitation flow (M1).
 *
 * Lives here rather than in settings/actions.ts because a `'use server'` file
 * may only export async functions — a plain `export const` there is a build
 * error, and typecheck does not catch it.
 */

/** How long an invitation stays valid. Mirrored in the 0021 column default. */
export const INVITE_EXPIRY_DAYS = 14

/**
 * Does a signed-in address plausibly match the masked one the invite page was
 * given? `peek_collaborator_invitation` returns `p***@example.com` rather than
 * the real address, so an unauthenticated visitor holding a link cannot
 * harvest it — which means the "you're signed in as someone else" check has to
 * work against the mask.
 *
 * Deliberately LENIENT. A false "looks fine" costs nothing: the accept RPC
 * re-checks the real address and refuses with an accurate message. A false
 * mismatch would strand someone holding a perfectly good invitation behind a
 * screen telling them to sign in as an account they are already using.
 */
export function invitedAddressMatches(mask: string, actual: string): boolean {
  if (!mask || !actual) return true
  const at = mask.lastIndexOf('@')
  if (at < 1) return true
  const domain = mask.slice(at + 1).toLowerCase()
  const first = mask[0].toLowerCase()
  const a = actual.toLowerCase()
  return a.endsWith(`@${domain}`) && a[0] === first
}
