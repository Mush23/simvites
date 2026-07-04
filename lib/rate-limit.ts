// Fixed-window rate limiter for the public guest endpoints.
// Per-instance memory: on serverless each warm instance keeps its own window,
// which still blunts brute force from a single source (an attacker hammering
// one edge region hits the same instance). Swap the Map for Upstash Redis at
// scale — the call sites won't change.

const buckets = new Map<string, { n: number; reset: number }>()

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  if (buckets.size > 10_000) buckets.clear() // bound memory
  const b = buckets.get(key)
  if (!b || now > b.reset) {
    buckets.set(key, { n: 1, reset: now + windowMs })
    return true
  }
  if (b.n >= max) return false
  b.n++
  return true
}

export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}
