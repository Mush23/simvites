import { NextResponse, type NextRequest } from 'next/server'
import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Resend delivery webhook. Idempotent: each event is recorded once in
 * provider_webhook_events (unique on provider + provider_event_id); a duplicate
 * delivery short-circuits. Updates message_recipients by provider_message_id.
 *
 * NOTE: when RESEND_WEBHOOK_SECRET is set, add Svix signature verification here
 * before trusting the payload.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text()
  const eventId =
    request.headers.get('svix-id') ?? createHash('sha256').update(raw).digest('hex')

  let body: { type?: string; data?: { email_id?: string; to?: string[] } }
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Idempotency gate.
  const { error: insErr } = await supabase
    .from('provider_webhook_events')
    .insert({ provider: 'resend', provider_event_id: eventId, payload: body, processed_at: new Date().toISOString() })
  if (insErr) {
    // Unique violation → already processed. Ack without reprocessing.
    if (/duplicate|unique/i.test(insErr.message)) return NextResponse.json({ ok: true, duplicate: true })
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  const emailId = body.data?.email_id
  const now = new Date().toISOString()
  const map: Record<string, Record<string, string>> = {
    'email.delivered': { status: 'delivered', delivered_at: now },
    'email.opened': { status: 'opened', opened_at: now },
    'email.bounced': { status: 'bounced', bounced_at: now },
  }
  const update = body.type ? map[body.type] : undefined

  if (emailId && update) {
    await supabase.from('message_recipients').update(update).eq('provider_message_id', emailId)
  }

  // Complaints → suppression list.
  if (body.type === 'email.complained' && body.data?.to?.[0]) {
    await supabase
      .from('suppression_list')
      .insert({ address: body.data.to[0], channel: 'email', reason: 'complaint' })
      .then(() => {}, () => {})
  }

  return NextResponse.json({ ok: true })
}
