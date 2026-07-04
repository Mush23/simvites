'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { getStripe, UNLOCK_AMOUNT, UNLOCK_CURRENCY, UNLOCK_PRODUCT_NAME } from '@/lib/stripe'
import { track } from '@/lib/analytics'

function appBaseUrl() {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000'
  const proto = root.includes('localhost') || root.includes('lvh.me') ? 'http' : 'https'
  return `${proto}://${root}`
}

/** Start the one-time unlock checkout. Guarded until Stripe is connected. */
export async function startUnlockCheckout(): Promise<{ url?: string; error?: string }> {
  const stripe = getStripe()
  if (!stripe) return { error: 'Payments are not connected yet — add the Stripe keys and this button goes live.' }

  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: UNLOCK_CURRENCY,
        unit_amount: UNLOCK_AMOUNT,
        product_data: { name: UNLOCK_PRODUCT_NAME },
      },
    }],
    metadata: { site_id: site.siteId, product: 'unlock' },
    success_url: `${appBaseUrl()}/settings?unlocked=1`,
    cancel_url: `${appBaseUrl()}/settings`,
  })

  if (user) track('checkout_started', user.id, { site_id: site.siteId })
  return { url: session.url ?? undefined }
}

/** Site defaults (title + site-wide RSVP deadline + template). */
export async function updateSiteSettings(formData: FormData) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const title = String(formData.get('title') ?? '').trim()
  const deadline = String(formData.get('rsvp_deadline_default') ?? '').trim() || null
  if (!title) return { error: 'Site name is required.' }

  const { getTemplate } = await import('@/lib/templates/registry')
  const template = getTemplate(String(formData.get('template') ?? ''))

  const supabase = await createClient()
  const { error } = await supabase
    .from('sites')
    .update({ title, rsvp_deadline_default: deadline, theme: { template: template.key } })
    .eq('id', site.siteId)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidatePath('/website')
  return { ok: true, note: 'Saved. Re-publish your website to apply the look to the live site.' }
}
