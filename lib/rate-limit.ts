// Fixed-window rate limiter for the public guest endpoints.
// Per-instance memory: on serverless each warm instance keeps its own window,
// which still blunts brute force from a single source (an attacker hammering
// one edge region hits the same instance). Swap the Map for Upstash Redis at
// scale — the call sites won't change.

const MAX_BUCKETS = 10_000

const buckets = new Map<string, { n: number; reset: number }>()

/**
 * M10: this used to call `buckets.clear()` on overflow, which let anyone who
 * could mint distinct keys reset the limits for EVERYONE — spray 10,000
 * spoofed X-Forwarded-For values and every other visitor's RSVP and search
 * budget went back to zero along with yours.
 *
 * Now overflow evicts expired entries first, then the oldest-expiring ones,
 * and only ever as many as it needs. A flood costs the attacker their own
 * buckets rather than everybody's. Map preserves insertion order, so "oldest
 * first" is just iteration order.
 */
function evict(now: number) {
  for (const [k, b] of buckets) {
    if (now > b.reset) buckets.delete(k)
  }
  // Still full of live windows? Drop the oldest until we are back under.
  if (buckets.size >= MAX_BUCKETS) {
    const overflow = buckets.size - MAX_BUCKETS + 1
    let dropped = 0
    for (const k of buckets.keys()) {
      buckets.delete(k)
      if (++dropped >= overflow) break
    }
  }
}

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const b = buckets.get(key)
  if (b && now <= b.reset) {
    if (b.n >= max) return false
    b.n++
    return true
  }
  // New or expired window. Only pay for eviction when actually inserting.
  if (!b && buckets.size >= MAX_BUCKETS) evict(now)
  buckets.set(key, { n: 1, reset: now + windowMs })
  return true
}

/**
 * Best-effort client IP.
 *
 * ⚠ X-Forwarded-For is caller-supplied unless a trusted proxy overwrites it.
 * On Vercel it is set by the platform and the LEFT-most entry is the real
 * client, so this is sound in production — but it is not a security boundary
 * on its own, and any limit keyed on it must fail safe rather than fail open.
 * Prefer keying on something authenticated (user id, signed household id)
 * wherever one is available; only the pre-auth token route has no such handle.
 */
export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}
