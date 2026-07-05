'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { sendMessage, smsConfigured, whatsappConfigured } from '@/lib/twilio'

/**
 * Send a message to a household's first guest with a phone number. Records
 * the outbound message immediately; if Twilio isn't configured the send is a
 * no-op but the message is still logged (status 'skipped') so the thread
 * reads correctly and demos work.
 */
export async function sendToHousehold(householdId: string, channel: 'sms' | 'whatsapp', body: string): Promise<{ ok?: true; error?: string; skipped?: boolean }> {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  if (!site.isUnlocked) return { error: 'Messaging is part of the unlock — see Settings.' }
  const text = body.trim()
  if (!text) return { error: 'Write a message first.' }

  const supabase = await createClient()
  const { data: guests } = await supabase
    .from('guests').select('id, phone').eq('household_id', householdId).eq('site_id', site.siteId)
    .is('archived_at', null).not('phone', 'is', null)
  const recipient = (guests ?? []).find((g) => g.phone)
  if (!recipient?.phone) return { error: 'No guest in this household has a phone number.' }

  const send = await sendMessage({ to: recipient.phone, body: text, channel })
  await supabase.from('messages').insert({
    site_id: site.siteId, household_id: householdId, guest_id: recipient.id,
    direction: 'out', channel, body: text, address: recipient.phone,
    provider_sid: send.sid ?? null, status: send.skipped ? 'skipped' : send.error ? 'failed' : (send.status ?? 'queued'),
  })
  revalidatePath('/messages')
  if (send.error) return { error: send.error }
  return { ok: true, skipped: send.skipped }
}

export async function messagingStatus() {
  return { sms: smsConfigured(), whatsapp: whatsappConfigured() }
}
