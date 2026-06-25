import Stripe from 'stripe'

// Guarded Stripe client: returns null until STRIPE_SECRET_KEY is set, so the
// rest of the app (and the checkout button) degrade gracefully pre-connection.
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

/** One-time price for the MVP "Wedding Package" (minor units, GBP). */
export const WEDDING_PACKAGE_AMOUNT = 9900
export const WEDDING_PACKAGE_CURRENCY = 'gbp'
