import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateTwilioSignature } from '@/lib/twilio'

// Inbound Twilio webhook (SMS + WhatsApp). Twilio POSTs form-encoded data
// when a guest replies. We match the sender's phone to a guest, store the
// message in that household's thread, and reply with empty TwiML (no auto
// reply). Idempotent via the unique provider_sid index.
export const dynamic = 'force-dynamic'

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
const twiml = (body = EMPTY_TWIML) =>
  new NextResponse(body, { status: 200, headers: { 'Content-Type': 'text/xml' } })

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const params = Object.fromEntries(new URLSearchParams(raw)) as Record<string, string>

  // Signature check (no-op if TWILIO_AUTH_TOKEN unset, for local testing).
  const url = req.headers.get('x-forwarded-proto') && req.headers.get('host')
    ? `${req.headers.get('x-forwarded-proto')}://${req.headers.get('host')}${req.nextUrl.pathname}`
    : req.url
  if (!validateTwilioSignature(url, params, req.headers.get('x-twilio-signature'))) {
    return NextResponse.json({ error: 'bad signature' }, { status: 403 })
  }

  const fromRaw = params.From ?? ''
  const body = params.Body ?? ''
  const sid = params.MessageSid ?? params.SmsSid ?? null
  const channel: 'sms' | 'whatsapp' = fromRaw.startsWith('whatsapp:') ? 'whatsapp' : 'sms'
  const phone = fromRaw.replace('whatsapp:', '').trim()
  if (!phone || !body) return twiml()

  const db = createAdminClient()

  // Idempotency: skip if we already stored this SID.
  if (sid) {
    const { data: dupe } = await db.from('messages').select('id').eq('provider_sid', sid).maybeSingle()
    if (dupe) return twiml()
  }

  // Match the sender to a guest by phone (last 9 digits, to be forgiving of
  // country-code formatting), then find their household + site.
  interface GuestRow { id: string; site_id: string; household_id: string; phone: string | null }
  const tail = phone.replace(/\D/g, '').slice(-9)
  const { data: guests } = await db
    .from('guests').select('id, site_id, household_id, phone').not('phone', 'is', null).is('archived_at', null)
  const match = ((guests ?? []) as GuestRow[]).find((g) => (g.phone ?? '').replace(/\D/g, '').slice(-9) === tail)

  if (!match) {
    // Unknown sender — log nothing, acknowledge so Twilio doesn't retry.
    return twiml()
  }

  await db.from('messages').insert({
    site_id: match.site_id, household_id: match.household_id, guest_id: match.id,
    direction: 'in', channel, body, address: phone, provider_sid: sid, status: 'received',
  })

  return twiml()
}
