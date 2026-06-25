// Thin Resend wrapper. Guarded: if RESEND_API_KEY is unset, sending is a no-op
// that reports `skipped` — so invite-link generation works before email is
// connected. When the key is added, the same calls start delivering.

export interface SendResult {
  id?: string
  skipped?: boolean
  error?: string
}

const FROM = process.env.RESEND_FROM ?? 'Simvites <onboarding@resend.dev>'

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY
}

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<SendResult> {
  if (!emailConfigured()) return { skipped: true }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html }),
    })
    const data = (await res.json()) as { id?: string; message?: string }
    if (!res.ok) return { error: data.message ?? `Resend error ${res.status}` }
    return { id: data.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'send failed' }
  }
}

export function invitationEmailHtml(opts: {
  siteName: string
  householdName: string
  link: string
}) {
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px;color:#2b2018">
    <p style="letter-spacing:.2em;text-transform:uppercase;font-size:12px;color:#9a7b3f">${opts.siteName}</p>
    <h1 style="font-weight:400;font-size:30px;margin:8px 0 16px">You're invited</h1>
    <p style="font-size:16px;line-height:1.6">Dear ${opts.householdName}, we would be honoured to celebrate with you.</p>
    <p style="font-size:16px;line-height:1.6">Open your personalised invitation to view the events and RSVP:</p>
    <p style="margin:28px 0">
      <a href="${opts.link}" style="background:#7a1f1f;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;letter-spacing:.12em;text-transform:uppercase;font-size:13px">View your invitation</a>
    </p>
    <p style="font-size:13px;color:#888">If the button doesn't work, paste this link into your browser:<br>${opts.link}</p>
  </div>`
}
