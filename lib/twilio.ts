// Guarded Twilio client for SMS + WhatsApp. If credentials are unset,
// smsConfigured()/whatsappConfigured() are false and sending is a no-op that
// reports `skipped` — so the inbox and threads work before Twilio is wired,
// and start delivering the moment the env vars are added.
//
// Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM (E.164),
//      TWILIO_WHATSAPP_FROM (E.164, without the "whatsapp:" prefix).

import { createHmac, timingSafeEqual } from 'node:crypto'

export function smsConfigured() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_SMS_FROM)
}
export function whatsappConfigured() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM)
}
export function messagingConfigured() {
  return smsConfigured() || whatsappConfigured()
}

export interface SendResult { sid?: string; skipped?: boolean; error?: string; status?: string }

export async function sendMessage(opts: {
  to: string
  body: string
  channel: 'sms' | 'whatsapp'
}): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const smsFrom = process.env.TWILIO_SMS_FROM
  const waFrom = process.env.TWILIO_WHATSAPP_FROM
  const configured = opts.channel === 'whatsapp' ? whatsappConfigured() : smsConfigured()
  if (!sid || !token || !configured) return { skipped: true }

  const from = opts.channel === 'whatsapp' ? `whatsapp:${waFrom}` : (smsFrom as string)
  const to = opts.channel === 'whatsapp' ? `whatsapp:${opts.to}` : opts.to

  const form = new URLSearchParams({ To: to, From: from, Body: opts.body })
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      signal: AbortSignal.timeout(15_000),
    })
    const data = (await res.json()) as { sid?: string; status?: string; message?: string }
    if (!res.ok) return { error: data.message ?? `Twilio ${res.status}` }
    return { sid: data.sid, status: data.status }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'send failed' }
  }
}

/**
 * Validate a Twilio inbound webhook signature (X-Twilio-Signature). Twilio
 * signs the full URL + sorted POST params with the auth token. Returns true
 * if no auth token is set (dev) so local testing works.
 */
/**
 * Verify Twilio's X-Twilio-Signature.
 *
 * Fails closed in production: an unset auth token used to return `true`, which
 * accepted ANY unsigned POST — forged inbound messages would appear in a
 * couple's inbox attributed to a real guest's number. Skipping the check is
 * only tolerable locally, where there is no tunnel to sign against.
 */
export function validateTwilioSignature(url: string, params: Record<string, string>, signature: string | null): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!token) return process.env.NODE_ENV !== 'production'
  if (!signature) return false
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('')
  const expected = createHmac('sha1', token).update(Buffer.from(data, 'utf-8')).digest('base64')
  // Constant-time: a plain === on an HMAC leaks its prefix through timing.
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}
