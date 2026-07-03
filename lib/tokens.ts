import { createHash, randomBytes } from 'node:crypto'

/**
 * Guest access tokens (handoff §5). The raw token is sent once in the link and
 * NEVER stored — only sha256(TOKEN_PEPPER + raw). The pepper is a server-only
 * secret: leaking the database alone is not enough to forge a valid link.
 *
 * Fails LOUDLY if TOKEN_PEPPER is unset — a silently unpeppered hash is a
 * security bug we refuse to ship (audit finding #2).
 */
function pepper(): string {
  const p = process.env.TOKEN_PEPPER
  if (!p) throw new Error('TOKEN_PEPPER is not set — refusing to hash guest tokens without it.')
  return p
}

export function generateGuestToken() {
  const raw = randomBytes(32).toString('base64url')
  return { raw, hash: hashToken(raw) }
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(pepper() + raw).digest('hex')
}
