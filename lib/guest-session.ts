import { createHmac, timingSafeEqual } from 'node:crypto'

// HttpOnly cookie that identifies a guest's household after they follow their
// personalised /i/<token> link. Never readable by JS; signed so it can't be
// forged. Holds only household + site ids (no PII).

export const GUEST_COOKIE = 'simvites_guest'

interface GuestSession {
  householdId: string
  siteId: string
}

function secret(): string {
  return (
    process.env.GUEST_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'dev-insecure-secret'
  )
}

export function signGuestSession(session: GuestSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

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
    return session
  } catch {
    return null
  }
}
