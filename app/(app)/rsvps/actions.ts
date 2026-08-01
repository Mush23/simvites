'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { sendEmail, emailConfigured, escapeHtml } from '@/lib/email'
import { generateGuestToken } from '@/lib/tokens'
import { siteUrl } from '@/lib/tenant'

/**
 * Email a gentle reminder to every household that hasn't responded yet
 * (fresh personal link included). One click today; scheduled via Inngest
 * post-launch. Guarded until Resend is connected.
 */
export async function sendReminders() {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  if (!site.isUnlocked) return { error: 'Sending is part of the unlock — see Settings.' }
  const supabase = await createClient()

  const [{ data: households }, { data: guests }, { data: responses }] = await Promise.all([
    supabase.from('households').select('id, name').eq('site_id', site.siteId).is('archived_at', null),
    supabase.from('guests').select('id, household_id, email').eq('site_id', site.siteId).is('archived_at', null),
    supabase.from('responses').select('guest_id').eq('site_id', site.siteId),
  ])
  const responded = new Set((responses ?? []).map((r) => r.guest_id))
  const pending = (households ?? []).filter(
    (h) => !(guests ?? []).some((g) => g.household_id === h.id && responded.has(g.id)),
  )

  let sent = 0
  for (const h of pending) {
    const emails = [...new Set((guests ?? []).filter((g) => g.household_id === h.id && g.email).map((g) => g.email as string))]
    if (!emails.length) continue
    const { raw, hash } = generateGuestToken()
    await supabase.from('guest_access_tokens').insert({ site_id: site.siteId, household_id: h.id, token_hash: hash })
    const link = `${siteUrl(site.slug)}/i/${raw}`
    for (const to of emails) {
      const res = await sendEmail({
        to,
        subject: `A gentle reminder — ${site.title}`,
        // M5: household name is user-controlled — escape before it becomes markup.
        html: `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px;color:#2a241d"><h1 style="font-weight:400">Dear ${escapeHtml(h.name)},</h1><p style="line-height:1.65">We'd love to know if you can join us. It takes under a minute:</p><p style="margin:26px 0"><a href="${escapeHtml(link)}" style="background:#b4552d;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:600">Respond now</a></p></div>`,
      })
      if (!res.error && !res.skipped) sent++
    }
  }

  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('activity_log').insert({
    site_id: site.siteId, actor_id: user?.id ?? null, verb: 'sent_reminders',
    entity_type: 'site', entity_id: site.siteId,
    meta: { pendingHouseholds: pending.length, delivered: sent, configured: emailConfigured() },
  })

  revalidatePath('/rsvps')
  return {
    ok: true,
    note: emailConfigured()
      ? `Reminders sent to ${sent} address${sent === 1 ? '' : 'es'} across ${pending.length} pending households.`
      : `${pending.length} pending households found — connect Resend to deliver (links were generated).`,
  }
}
