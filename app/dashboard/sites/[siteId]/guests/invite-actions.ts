'use server'

import { createClient } from '@/lib/supabase/server'
import { generateInvitationToken } from '@/lib/tokens'
import { siteUrl } from '@/lib/tenant'
import { sendEmail, invitationEmailHtml, emailConfigured } from '@/lib/email'

async function siteContext(siteId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('sites')
    .select('org_id, slug, name')
    .eq('id', siteId)
    .maybeSingle()
  return { supabase, site: data as { org_id: string; slug: string; name: string } | null }
}

/**
 * Create (or rotate) a household's invitation and return the personalised link.
 * The raw token is shown to the founder ONCE here (to copy / WhatsApp / email);
 * only its hash is stored.
 */
export async function generateInviteLink(siteId: string, householdId: string) {
  const { supabase, site } = await siteContext(siteId)
  if (!site) return { error: 'Site not found.' }

  const { raw, hash, prefix } = generateInvitationToken()

  const { error } = await supabase.from('invitations').upsert(
    {
      org_id: site.org_id,
      site_id: siteId,
      household_id: householdId,
      token_hash: hash,
      token_prefix: prefix,
      revoked_at: null,
      expires_at: null,
    },
    { onConflict: 'household_id' },
  )
  if (error) return { error: error.message }

  return { link: `${siteUrl(site.slug)}/i/${raw}` }
}

/** Generate a link and email it to the household (if it has an email + Resend is on). */
export async function sendInvitation(siteId: string, householdId: string) {
  const { supabase, site } = await siteContext(siteId)
  if (!site) return { error: 'Site not found.' }

  const { data: household } = await supabase
    .from('households')
    .select('name, email')
    .eq('id', householdId)
    .maybeSingle()
  if (!household?.email) return { error: 'This household has no email address.' }

  const gen = await generateInviteLink(siteId, householdId)
  if ('error' in gen && gen.error) return gen
  const link = (gen as { link: string }).link

  // Track the send.
  const { data: batch } = await supabase
    .from('message_batches')
    .insert({ org_id: site.org_id, site_id: siteId, channel: 'email', subject: `You're invited — ${site.name}`, status: 'sending' })
    .select('id')
    .single()

  const result = await sendEmail({
    to: household.email,
    subject: `You're invited — ${site.name}`,
    html: invitationEmailHtml({ siteName: site.name, householdName: household.name as string, link }),
  })

  const status = result.error ? 'failed' : result.skipped ? 'queued' : 'sent'
  await supabase.from('message_recipients').insert({
    org_id: site.org_id,
    site_id: siteId,
    batch_id: batch?.id,
    household_id: householdId,
    to_address: household.email,
    channel: 'email',
    status,
    provider_message_id: result.id ?? null,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
    error: result.error ?? null,
  })
  await supabase.from('message_batches').update({ status: result.error ? 'failed' : 'sent' }).eq('id', batch?.id)

  if (result.error) return { error: result.error }
  if (result.skipped) return { ok: true, note: 'Email is not connected yet (no Resend key) — link generated and queued.' }
  return { ok: true, note: `Sent to ${household.email}.` }
}

export { emailConfigured }
