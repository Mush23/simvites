import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { track } from '@/lib/analytics'

/**
 * Stripe webhook (handoff route map). Idempotent via webhook_events (unique on
 * provider + event id). checkout.session.completed → sites.is_unlocked.
 *
 * SIGNATURE VERIFICATION IS MANDATORY IN PRODUCTION. The unsigned path exists
 * only so the flow is testable locally without a Stripe CLI tunnel. It used to
 * be reached whenever the secret was absent, for any environment — which meant
 * one missing env var in production turned this endpoint into a paywall bypass:
 * anyone could POST a checkout.session.completed carrying a site_id and unlock
 * a site for free. Missing config now fails closed instead.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text()
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const signed = Boolean(stripe && secret)

  if (!signed && process.env.NODE_ENV === 'production') {
    // 503, not 400: the caller did nothing wrong — we are misconfigured, and
    // Stripe will retry, so the events are not lost once the secret is set.
    console.error('[stripe] STRIPE_WEBHOOK_SECRET is not set — refusing unsigned webhooks.')
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 })
  }

  let event: Stripe.Event
  if (signed) {
    try {
      event = stripe!.webhooks.constructEvent(raw, request.headers.get('stripe-signature') ?? '', secret!)
    } catch (e) {
      return NextResponse.json({ error: `signature: ${e instanceof Error ? e.message : 'invalid'}` }, { status: 400 })
    }
  } else {
    try {
      event = JSON.parse(raw) as Stripe.Event
    } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }
  }

  const db = createAdminClient()

  // Idempotency gate — duplicates ack without reprocessing.
  const { error: insErr } = await db.from('webhook_events').insert({
    provider: 'stripe',
    provider_event_id: event.id,
    payload: event as unknown as Record<string, unknown>,
  })
  if (insErr) {
    if (/duplicate|unique/i.test(insErr.message)) return NextResponse.json({ ok: true, duplicate: true })
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const siteId = session.metadata?.site_id
    if (siteId && session.metadata?.product === 'unlock') {
      await db.from('sites').update({ is_unlocked: true }).eq('id', siteId)
      await db.from('activity_log').insert({
        site_id: siteId,
        verb: 'unlocked',
        entity_type: 'site',
        entity_id: siteId,
        meta: { checkout_session: session.id, amount: session.amount_total },
      })
      track('site_unlocked', siteId, { amount: session.amount_total })
    }
  }

  return NextResponse.json({ ok: true })
}
