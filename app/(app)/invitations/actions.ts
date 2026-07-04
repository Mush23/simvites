'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { generateGuestToken } from '@/lib/tokens'
import { siteUrl } from '@/lib/tenant'
import { sendEmail, invitationEmailHtml, emailConfigured } from '@/lib/email'
import { BRAND_NAME } from '@/lib/brand'

/**
 * Create a personalised link for a household. The raw token is returned ONCE
 * (to copy / email) — only its peppered hash is stored. Existing links keep
 * working; use revokeLinks to invalidate them all.
 */
export async function generateHouseholdLink(householdId: string) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const supabase = await createClient()

  const { raw, hash } = generateGuestToken()
  const { error } = await supabase.from('guest_access_tokens').insert({
    site_id: site.siteId,
    household_id: householdId,
    token_hash: hash,
  })
  if (error) return { error: error.message }

  revalidatePath('/invitations')
  return { link: `${siteUrl(site.slug)}/i/${raw}` }
}

/** Invalidate every link previously issued to a household. */
export async function revokeLinks(householdId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('guest_access_tokens')
    .update({ revoked: true })
    .eq('household_id', householdId)
    .eq('revoked', false)
  if (error) return { error: error.message }
  revalidatePath('/invitations')
  return { ok: true }
}

/**
 * Email the invitation to every guest in the household with an email address.
 * Generates a fresh token for the send. No-ops gracefully (status 'queued')
 * until RESEND_API_KEY is connected.
 */
export async function sendInvitation(householdId: string) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const supabase = await createClient()

  const [{ data: household }, { data: guests }] = await Promise.all([
    supabase.from('households').select('name').eq('id', householdId).maybeSingle(),
    supabase.from('guests').select('email').eq('household_id', householdId)
      .is('archived_at', null).not('email', 'is', null),
  ])
  if (!household) return { error: 'Household not found.' }

  const emails = [...new Set((guests ?? []).map((g) => g.email as string).filter(Boolean))]
  if (!emails.length) return { error: 'No guest in this household has an email address.' }

  const gen = await generateHouseholdLink(householdId)
  if ('error' in gen && gen.error) return gen
  const link = (gen as { link: string }).link

  let sent = 0
  let note = ''
  for (const to of emails) {
    const res = await sendEmail({
      to,
      subject: `You're invited — ${site.title}`,
      html: invitationEmailHtml({ siteName: site.title, householdName: household.name, link }),
    })
    if (res.error) return { error: `Sending to ${to} failed: ${res.error}` }
    if (res.skipped) note = 'Email is not connected yet (no Resend key) — link generated; copy it and share directly.'
    else sent++
  }

  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('activity_log').insert({
    site_id: site.siteId,
    actor_id: user?.id ?? null,
    verb: 'sent_invites',
    entity_type: 'household',
    entity_id: householdId,
    meta: { emails: emails.length, delivered: sent, configured: emailConfigured() },
  })

  revalidatePath('/invitations')
  return { ok: true, link, note: note || `Sent to ${sent} address${sent === 1 ? '' : 'es'}.` }
}
