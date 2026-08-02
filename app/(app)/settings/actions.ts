'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { getStripe, UNLOCK_PRODUCT_NAME } from '@/lib/stripe'
import { getUnlockPrice } from '@/lib/pricing'
import { track } from '@/lib/analytics'
import { INVITE_EXPIRY_DAYS } from '@/lib/collaborators'

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
 * Invite a collaborator (partner, parent, planner) into the org.
 *
 * M1: this used to call `auth.admin.createUser({ email_confirm: true })` for
 * whatever address was typed into the box and insert the membership on the
 * spot — a confirmed account and full access to a stranger's wedding, with no
 * acceptance step and no email to the person it happened to.
 *
 * Now it writes a pending invitation and sends a link. Nothing exists for the
 * invitee until they sign in AS that address and accept, which also means an
 * invitation sent to the wrong address creates nothing at all.
 */
export async function inviteCollaborator(formData: FormData) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  // Only an owner can hand out access to the wedding they own.
  if (site.role !== 'owner') {
    return { error: 'Only the owner of this wedding can invite collaborators.' }
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid email.' }
  if (email.length > 320) return { error: 'That email address is too long.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in again.' }
  if (email === (user.email ?? '').toLowerCase()) {
    return { error: 'That is your own address — you already have access.' }
  }

  // Outbound mail on our domain, and rows in someone else's name. Capped.
  const { rateLimit } = await import('@/lib/rate-limit')
  if (!rateLimit(`collab:${site.orgId}`, 10, 60 * 60_000)) {
    return { error: 'Too many invitations in the last hour — try again later.' }
  }

  const { generateGuestToken } = await import('@/lib/tokens')
  const { raw, hash } = generateGuestToken()
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  // Re-inviting the same address replaces the live invitation rather than
  // stacking rows — the partial unique index enforces one live per address.
  await supabase
    .from('collaborator_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('org_id', site.orgId)
    .eq('email', email)
    .is('accepted_at', null)
    .is('revoked_at', null)

  const { error } = await supabase.from('collaborator_invitations').insert({
    org_id: site.orgId,
    email,
    role: 'collaborator',
    token_hash: hash,
    invited_by: user.id,
    expires_at: expiresAt.toISOString(),
  })
  if (error) return { error: error.message }

  const { sendEmail, collaboratorInviteEmailHtml, emailConfigured } = await import('@/lib/email')
  const link = `${appBaseUrl()}/invite/${raw}`
  const res = await sendEmail({
    to: email,
    subject: `${user.email ?? 'Someone'} invited you to help plan ${site.title}`,
    html: collaboratorInviteEmailHtml({
      orgName: site.title,
      inviterEmail: user.email ?? 'A Simvites user',
      link,
      expiresInDays: INVITE_EXPIRY_DAYS,
    }),
  })

  revalidatePath('/settings')
  if (res.error) {
    return { error: `Invitation saved, but the email failed to send: ${res.error}` }
  }
  if (!emailConfigured() || res.skipped) {
    // The raw token is only ever visible here — after this response it exists
    // nowhere, since the database stores the hash.
    return { ok: true, note: `Email isn't connected yet. Send them this link yourself: ${link}` }
  }
  return { ok: true, note: `Invitation sent to ${email}. It expires in ${INVITE_EXPIRY_DAYS} days.` }
}

/** Withdraw a pending invitation. Owner-only, enforced by RLS as well. */
export async function revokeCollaboratorInvitation(invitationId: string) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('collaborator_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('org_id', site.orgId)
    .is('accepted_at', null)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { ok: true }
}

/**
 * Remove someone's access. Owners cannot be removed this way — ownership comes
 * from creating the org, and letting a collaborator strip it would be a
 * privilege inversion.
 */
export async function removeCollaborator(userId: string) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  if (site.role !== 'owner') return { error: 'Only the owner can remove collaborators.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id === userId) return { error: 'You cannot remove yourself.' }

  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('org_id', site.orgId)
    .eq('user_id', userId)
    .neq('role', 'owner')
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { ok: true }
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
