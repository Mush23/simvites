import 'server-only'

// Guarded PostHog capture (server-side, plain HTTP — no SDK weight).
// No-ops until NEXT_PUBLIC_POSTHOG_KEY is set. Fire-and-forget: analytics
// must never slow down or break a user action.
//
// Funnel (handoff §1): signup → site created → published → invites sent → RSVPs.

const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com'

export function track(
  event: string,
  distinctId: string,
  properties: Record<string, unknown> = {},
): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return
  void fetch(`${HOST}/i/v0/e/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      event,
      distinct_id: distinctId,
      properties: { ...properties, source: 'server' },
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {})
}
