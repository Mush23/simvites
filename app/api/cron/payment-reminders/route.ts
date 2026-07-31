import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail, emailConfigured } from '@/lib/email'
import { formatPence } from '@/lib/money'
import { BRAND_NAME } from '@/lib/brand'

// Daily payment-reminder job (Vercel Cron → this route). For every scheduled
// vendor payment whose reminder window has arrived and hasn't been emailed,
// notify the site's owner and stamp reminded_at so it fires once.
//
// Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. In production
// set CRON_SECRET; requests without it are rejected. Runs service-role.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  // Fail closed. The check used to be wrapped in `if (secret)`, so an unset
  // variable skipped authentication entirely and left this endpoint open —
  // anyone knowing the path could fire payment-reminder emails at a couple's
  // vendors, as often as they liked. Unauthenticated is only tolerable locally.
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[cron] CRON_SECRET is not set — refusing to run unauthenticated.')
      return NextResponse.json({ error: 'Cron is not configured.' }, { status: 503 })
    }
  } else if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const todayStr = new Date().toISOString().slice(0, 10)

  interface DuePayment {
    id: string; site_id: string; label: string; amount: number
    due_date: string; remind_days_before: number | null; vendor_id: string | null
  }

  // Pull scheduled, not-yet-reminded payments due within the widest window.
  const { data: payments, error } = await db
    .from('vendor_payments')
    .select('id, site_id, label, amount, due_date, remind_days_before, vendor_id')
    .is('archived_at', null)
    .eq('status', 'scheduled')
    .is('reminded_at', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const all = (payments ?? []) as DuePayment[]

  // Keep only those whose (due_date − remind_days_before) is today or past.
  const due = all.filter((p) => {
    const remindOn = new Date(p.due_date + 'T00:00:00')
    remindOn.setDate(remindOn.getDate() - (p.remind_days_before ?? 7))
    return remindOn.toISOString().slice(0, 10) <= todayStr
  })
  if (due.length === 0) return NextResponse.json({ ok: true, reminded: 0 })

  // Resolve owner email + site + vendor names in bulk.
  interface SiteRow { id: string; title: string; org_id: string }
  interface VendorRow { id: string; name: string }
  const siteIds = [...new Set(due.map((p) => p.site_id))]
  const vendorIds = [...new Set(due.map((p) => p.vendor_id).filter(Boolean))] as string[]
  const { data: sitesData } = await db.from('sites').select('id, title, org_id').in('id', siteIds)
  const { data: vendorsData } = vendorIds.length
    ? await db.from('vendors').select('id, name').in('id', vendorIds)
    : { data: [] as VendorRow[] }
  const sites = (sitesData ?? []) as SiteRow[]
  const siteById = new Map(sites.map((s) => [s.id, s]))
  const vendorById = new Map(((vendorsData ?? []) as VendorRow[]).map((v) => [v.id, v.name] as const))

  // Owner email per org (first owner membership → profile email).
  interface OwnerRow { org_id: string; profiles: { email: string | null } | { email: string | null }[] | null }
  const orgIds = [...new Set(sites.map((s) => s.org_id))]
  const { data: ownersData } = await db
    .from('memberships')
    .select('org_id, role, profiles(email)')
    .in('org_id', orgIds)
    .eq('role', 'owner')
  const emailByOrg = new Map<string, string>()
  for (const o of (ownersData ?? []) as OwnerRow[]) {
    const prof = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles
    const email = prof?.email
    if (email && !emailByOrg.has(o.org_id)) emailByOrg.set(o.org_id, email)
  }

  let sent = 0
  const remindedIds: string[] = []
  for (const p of due) {
    const site = siteById.get(p.site_id)
    const to = site ? emailByOrg.get(site.org_id) : undefined
    const vendorName = (p.vendor_id ? vendorById.get(p.vendor_id) : null) ?? null
    remindedIds.push(p.id) // stamp regardless, so we don't loop on a missing address

    if (to && emailConfigured()) {
      const res = await sendEmail({
        to,
        subject: `Payment reminder: ${p.label}${vendorName ? ` — ${vendorName}` : ''} due ${new Date(p.due_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`,
        html: reminderHtml({
          siteName: site?.title ?? BRAND_NAME,
          label: p.label, vendorName, amount: formatPence(p.amount),
          dueDate: new Date(p.due_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        }),
      })
      if (res.id) sent++
    }
  }

  // Stamp reminded_at once (idempotent: won't re-fire tomorrow).
  if (remindedIds.length) {
    await db.from('vendor_payments').update({ reminded_at: new Date().toISOString() }).in('id', remindedIds)
  }

  return NextResponse.json({ ok: true, matched: due.length, emailed: sent, emailConfigured: emailConfigured() })
}

function reminderHtml(o: { siteName: string; label: string; vendorName: string | null; amount: string; dueDate: string }) {
  return `
  <div style="background:#FAFAF8;padding:36px 16px;font-family:'Instrument Sans',Helvetica,Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E8E7E4;border-radius:12px;padding:32px;color:#191918">
      <p style="font-size:12px;font-weight:600;color:#8F8D88;margin:0 0 12px;text-transform:uppercase;letter-spacing:.06em">${o.siteName} · Payment reminder</p>
      <h1 style="font-size:22px;font-weight:650;letter-spacing:-.02em;margin:0 0 8px">${o.label}${o.vendorName ? ` — ${o.vendorName}` : ''}</h1>
      <p style="font-size:14px;line-height:1.6;color:#6A6864;margin:0 0 20px">This payment is coming up. Here are the details so you can get the transfer ready.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#8F8D88">Amount</td><td style="padding:8px 0;text-align:right;font-weight:600">${o.amount}</td></tr>
        <tr><td style="padding:8px 0;color:#8F8D88;border-top:1px solid #E8E7E4">Due</td><td style="padding:8px 0;text-align:right;font-weight:600;border-top:1px solid #E8E7E4">${o.dueDate}</td></tr>
      </table>
      <p style="font-size:12.5px;color:#8F8D88;margin:22px 0 0;line-height:1.6">Once you have paid, mark it done in your payment schedule and your budget updates automatically.</p>
    </div>
  </div>`
}
