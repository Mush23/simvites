import { createHmac, timingSafeEqual } from 'node:crypto'

// HttpOnly cookie that identifies a guest's household after they follow their
// personalised /i/<token> link. Never readable by JS; signed so it can't be
// forged. Holds only household + site + token ids (no PII).

export const GUEST_COOKIE = 'simvites_guest'

/** 180 days — the wedding season. Matches the cookie's maxAge. */
export const GUEST_SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000

export interface GuestSession {
  householdId: string
  siteId: string
  /** guest_access_tokens.id this session was minted from (M2). */
  tokenId: string
  /** Expiry, ms since epoch (M2). */
  exp: number
}

function secret(): string {
  const s = process.env.GUEST_SESSION_SECRET
  // Fail loudly: silently signing guest cookies with a fallback secret is a
  // security bug (audit finding #2). Set GUEST_SESSION_SECRET everywhere.
  if (!s) throw new Error('GUEST_SESSION_SECRET is not set — refusing to sign guest sessions without it.')
  return s
}

export function signGuestSession(session: GuestSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

/**
 * Signature + expiry only. This proves the cookie came from us and is not
 * stale; it does NOT prove the invitation is still valid — see
 * `loadGuestSession` for that.
 */
export function verifyGuestSession(value: string | undefined | null): GuestSession | null {
  if (!value) return null
  const [payload, sig] = value.split('.')
  if (!payload || !sig) return null
  const expected = createHmac('sha256', secret()).update(payload).digest('base64url')
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as GuestSession
    if (!session.householdId || !session.siteId) return null
    // M2: sessions minted before token-binding existed have no tokenId/exp.
    // Reject them rather than grandfathering an unrevocable credential — the
    // guest just reopens their invitation link.
    if (!session.tokenId || typeof session.exp !== 'number') return null
    if (Date.now() > session.exp) return null
    return session
  } catch {
    return null
  }
}

/**
 * M2 — the check that makes "revoke" mean something.
 *
 * The /i/<token> route validates `revoked` and `expires_at` before issuing a
 * cookie, but the cookie used to carry only {householdId, siteId}: no expiry,
 * no reference to the token that minted it. So after the first open, neither
 * field was ever consulted again and the cookie was a PERMANENT, unrevocable
 * credential. Revoking a leaked invitation link did nothing; the 180-day
 * maxAge was a client-side hint anyone could ignore by keeping the string.
 *
 * Now every use re-reads the token row — one indexed lookup by primary key —
 * so revoking a link, or letting it expire, locks the holder out everywhere.
 */
export async function loadGuestSession(
  value: string | undefined | null,
): Promise<GuestSession | null> {
  const session = verifyGuestSession(value)
  if (!session) return null

  const { createAdminClient } = await import('@/lib/supabase/server')
  const db = createAdminClient()
  const { data: token } = await db
    .from('guest_access_tokens')
    .select('id, household_id, site_id, revoked, expires_at')
    .eq('id', session.tokenId)
    .maybeSingle()

  if (!token) return null
  if (token.revoked) return null
  if (token.expires_at && new Date(token.expires_at) < new Date()) return null
  // The token must still point where the cookie claims — a household moved or
  // re-pointed since minting invalidates the session rather than following it.
  if (token.household_id !== session.householdId || token.site_id !== session.siteId) return null

  return session
}
