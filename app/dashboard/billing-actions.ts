'use server'

import { createClient } from '@/lib/supabase/server'
import {
  getStripe,
  WEDDING_PACKAGE_AMOUNT,
  WEDDING_PACKAGE_CURRENCY,
} from '@/lib/stripe'

function appBaseUrl() {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000'
  const proto = root.includes('localhost') || root.includes('lvh.me') ? 'http' : 'https'
  return `${proto}://${root}`
}

/**
 * Create a one-time Stripe Checkout Session for a site's Wedding Package.
 * Returns the hosted checkout URL, or an error if Stripe isn't connected.
 */
export async function createCheckout(siteId: string): Promise<{ url?: string; error?: string }> {
  const stripe = getStripe()
  if (!stripe) return { error: 'Payments are not connected yet (add your Stripe keys).' }

  const supabase = await createClient()
  const { data: site } = await supabase
    .from('sites')
    .select('org_id, name')
    .eq('id', siteId)
    .maybeSingle()
  if (!site) return { error: 'Site not found.' }

  const base = appBaseUrl()
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: WEDDING_PACKAGE_CURRENCY,
          unit_amount: WEDDING_PACKAGE_AMOUNT,
          product_data: { name: `Simvites Wedding Package — ${site.name}` },
        },
      },
    ],
    metadata: { org_id: site.org_id as string, site_id: siteId, product: 'wedding_package' },
    success_url: `${base}/dashboard?paid=1`,
    cancel_url: `${base}/dashboard`,
  })

  return { url: session.url ?? undefined }
}
