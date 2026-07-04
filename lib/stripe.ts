import Stripe from 'stripe'
import { BRAND_NAME } from '@/lib/brand'

// Guarded Stripe client: null until STRIPE_SECRET_KEY is set, so billing
// degrades gracefully pre-connection (checkout shows "not connected yet").
let cached: Stripe | null = null

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  if (!cached) cached = new Stripe(key)
  return cached
}

export function stripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY
}

// One-time "Command Centre unlock" (handoff §7): free tier = draft + preview;
// unlock gates publish + invite-send. Minor units (pence).
export const UNLOCK_AMOUNT = 14900
export const UNLOCK_CURRENCY = 'gbp'
export const UNLOCK_PRODUCT_NAME = `${BRAND_NAME} — Command Centre unlock`
