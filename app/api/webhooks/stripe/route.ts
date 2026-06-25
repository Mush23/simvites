import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Stripe webhook. Doubly idempotent: provider_webhook_events is unique on
 * (provider, event.id), and purchases is unique on stripe_checkout_session_id.
 * Verifies the Stripe signature when STRIPE_WEBHOOK_SECRET is set; in local dev
 * without a secret it accepts unsigned JSON so the flow can be exercised.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text()
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event
  if (stripe && secret) {
    const sig = request.headers.get('stripe-signature')
    try {
      event = stripe.webhooks.constructEvent(raw, sig ?? '', secret)
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

  const supabase = createAdminClient()

  // Idempotency gate.
  const { error: insErr } = await supabase
    .from('provider_webhook_events')
    .insert({ provider: 'stripe', provider_event_id: event.id, payload: event as unknown as Record<string, unknown>, processed_at: new Date().toISOString() })
  if (insErr) {
    if (/duplicate|unique/i.test(insErr.message)) return NextResponse.json({ ok: true, duplicate: true })
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session
    const meta = s.metadata ?? {}
    if (meta.org_id) {
      await supabase
        .from('purchases')
        .insert({
          org_id: meta.org_id,
          site_id: meta.site_id ?? null,
          stripe_checkout_session_id: s.id,
          stripe_payment_intent_id: typeof s.payment_intent === 'string' ? s.payment_intent : null,
          product: meta.product ?? 'wedding_package',
          amount: s.amount_total ?? null,
          currency: s.currency ?? 'gbp',
          status: 'paid',
        })
        .then(() => {}, () => {}) // unique on session id => idempotent
      await supabase.from('audit_logs').insert({
        org_id: meta.org_id,
        actor_type: 'system',
        action: 'payment',
        target_table: 'purchases',
        metadata: { site_id: meta.site_id, session: s.id },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
