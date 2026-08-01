'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { getStripe, UNLOCK_PRODUCT_NAME } from '@/lib/stripe'
import { getUnlockPrice } from '@/lib/pricing'
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

  // E5: price comes from platform_settings (admin-editable), constant fallback.
  const price = await getUnlockPrice()
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: price.currency,
        unit_amount: price.amount,
        product_data: { name: UNLOCK_PRODUCT_NAME },
      },
    }],
    allow_promotion_codes: true,
    metadata: { site_id: site.siteId, product: 'unlock' },
    success_url: `${appBaseUrl()}/settings?unlocked=1`,
    cancel_url: `${appBaseUrl()}/settings`,
  })

  if (user) track('checkout_started', user.id, { site_id: site.siteId })
  return { url: session.url ?? undefined }
}

/** Restore a previously published website version into the current draft. */
export async function restoreVersion(versionId: string) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const supabase = await createClient()
  const { data: v } = await supabase.from('published_versions')
    .select('snapshot').eq('id', versionId).eq('site_id', site.siteId).maybeSingle()
  if (!v) return { error: 'Version not found.' }
  const snap = v.snapshot as { pages?: { is_home: boolean; puck_data: unknown }[]; theme?: unknown }
  const home = snap.pages?.find((p) => p.is_home) ?? snap.pages?.[0]
  if (home) {
    await supabase.from('pages').update({ puck_data: home.puck_data })
      .eq('site_id', site.siteId).eq('is_home', true)
  }
  if (snap.theme) await supabase.from('sites').update({ theme: snap.theme }).eq('id', site.siteId)
  revalidatePath('/website')
  revalidatePath('/settings')
  return { ok: true }
}

/**
 * Invite a collaborator (partner, parent, planner) into the org. Creates the
 * auth user if new; they sign in with the magic-link tab on /login.
 */
export async function addCollaborator(formData: FormData) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid email.' }

  // M5/M1: this mints confirmed auth accounts for arbitrary addresses. Cap it
  // so a single account cannot be used to bulk-create users or spray
  // memberships across the platform.
  const { rateLimit } = await import('@/lib/rate-limit')
  if (!rateLimit(`collab:${site.orgId}`, 10, 60 * 60_000)) {
    return { error: 'Too many collaborator invites in the last hour — try again later.' }
  }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const admin = createAdminClient()

  // Find or create the auth user (confirmed; they use magic-link to sign in).
  let userId: string | undefined
  const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, email_confirm: true })
  if (!cErr) userId = created.user?.id
  else {
    // M14: listUsers() is paginated and defaults to the first 50 users. Once
    // the platform outgrew that, re-adding an EXISTING collaborator failed
    // with "Could not create that account." for anyone outside page one — a
    // bug that gets more common the more successful you are. Prefer our own
    // profiles table (indexed, RLS-exempt under service role) and fall back to
    // walking the auth pages only if the profile row is missing.
    const { data: profile } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
    userId = (profile as { id: string } | null)?.id
    for (let page = 1; !userId && page <= 20; page++) {
      const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 })
      const users = list?.users ?? []
      if (!users.length) break
      userId = users.find((u: { email?: string; id: string }) => u.email === email)?.id
    }
  }
  if (!userId) return { error: 'Could not add that collaborator — check the address and try again.' }

  await admin.from('profiles').upsert({ id: userId, email })
  const { error } = await admin.from('memberships')
    .upsert({ org_id: site.orgId, user_id: userId, role: 'collaborator' }, { onConflict: 'org_id,user_id' })
  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { ok: true, note: `${email} added — they sign in at /login with the "Email link" tab.` }
}

/**
 * Site defaults: title + site-wide RSVP deadline.
 *
 * Does NOT touch `theme`. Template choice moved to /templates (Phase 2), and
 * this used to write `theme: { template }` wholesale — so with the picker gone
 * from this form, an absent `template` field would resolve to the DEFAULT
 * template and quietly reset the couple's look every time they renamed their
 * site. Themes are owned by the surfaces that edit them.
 */
export async function updateSiteSettings(formData: FormData) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const title = String(formData.get('title') ?? '').trim()
  const deadline = String(formData.get('rsvp_deadline_default') ?? '').trim() || null
  if (!title) return { error: 'Site name is required.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('sites')
    .update({ title, rsvp_deadline_default: deadline })
    .eq('id', site.siteId)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidatePath('/website')
  return { ok: true }
}
