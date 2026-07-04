import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { track } from '@/lib/analytics'

/**
 * Stripe webhook (handoff route map). Signature-verified when
 * STRIPE_WEBHOOK_SECRET is set (in dev without a secret it accepts unsigned
 * JSON so the flow is testable). Idempotent via webhook_events (unique on
 * provider + event id). checkout.session.completed → sites.is_unlocked.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text()
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event
  if (stripe && secret) {
    try {
      event = stripe.webhooks.constructEvent(raw, request.headers.get('stripe-signature') ?? '', secret)
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
