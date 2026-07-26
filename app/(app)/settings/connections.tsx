import { emailConfigured } from '@/lib/email'
import { smsConfigured, whatsappConfigured } from '@/lib/twilio'
import { aiConfigured } from '@/lib/ai'
import { getStripe } from '@/lib/stripe'

// One Setup surface. Replaces the amber banners that used to head Invitations
// and Messages: connection status belongs in one place, and the point of use
// gets a quiet inline hint (see ConnectionHint) instead of an alarm.
//
// Deliberately states what still WORKS without each integration. Nothing here
// blocks planning — a couple can build the whole wedding with none of these
// connected, and the copy should say so rather than imply a broken product.

interface Row {
  name: string
  connected: boolean
  worksAnyway: string
  envHint: string
}

export function Connections() {
  const rows: Row[] = [
    {
      name: 'Email',
      connected: emailConfigured(),
      worksAnyway: 'Invite links are always generated — copy and share them by hand.',
      envHint: 'RESEND_API_KEY',
    },
    {
      name: 'SMS & WhatsApp',
      connected: smsConfigured() || whatsappConfigured(),
      worksAnyway: 'Threads can be written and saved; they send once connected.',
      envHint: 'TWILIO_ACCOUNT_SID',
    },
    {
      name: 'Planning assistant',
      connected: aiConfigured(),
      worksAnyway: 'Guest import falls back to the column parser, which handles most spreadsheets.',
      envHint: 'ANTHROPIC_API_KEY',
    },
    {
      name: 'Card payments',
      connected: !!getStripe(),
      worksAnyway: 'Everything except taking payment for the unlock.',
      envHint: 'STRIPE_SECRET_KEY',
    },
  ]

  const live = rows.filter((r) => r.connected).length

  return (
    <section id="connections" className="scroll-mt-24 rounded-card border border-line bg-surface p-7 shadow-card">
      <p className="eyebrow mb-2">Connections</p>
      <p className="mb-5 text-sm text-ink-2">
        Optional services. <span className="nums">{live}</span> of <span className="nums">{rows.length}</span> connected —
        you can plan the entire wedding with none of them, and each one only adds a way to send.
      </p>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.name} className="flex items-start gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
            <span aria-hidden
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${r.connected ? 'bg-ok' : 'bg-line-2'}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium text-ink">
                {r.name}
                <span className="ml-2 text-[11.5px] font-normal text-ink-3">
                  {r.connected ? 'Connected' : 'Not connected'}
                </span>
              </p>
              {!r.connected && (
                <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">
                  {r.worksAnyway} Set <span className="font-mono text-[11.5px]">{r.envHint}</span> to enable sending.
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
