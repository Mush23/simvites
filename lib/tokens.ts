import { createHash, randomBytes } from 'node:crypto'

/**
 * Invitation tokens (brief §10 security): the raw token is sent once in the
 * link and NEVER stored. We persist only its SHA-256 hash (plus a short,
 * non-secret prefix for lookup/debugging).
 */
export function generateInvitationToken() {
  const raw = randomBytes(24).toString('base64url') // ~32 url-safe chars
  return { raw, hash: hashToken(raw), prefix: raw.slice(0, 8) }
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}
