import { notFound } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetch-all'
import { PageHeader, StatCard } from '@/components/app/ui'
import { ResetButton } from './reset-button'
import { PriceEditor } from './price-editor'
import { SitesRegister } from './sites-register'
import { formatPence } from '@/lib/money'

export const metadata = { title: 'Platform admin · Occasio' }

function countBy(rows: { site_id: string }[] | null): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rows ?? []) m.set(r.site_id, (m.get(r.site_id) ?? 0) + 1)
  return m
}

export default async function PlatformAdminPage() {
  const admin = await requirePlatformAdmin()
  if (!admin) notFound() // invisible to everyone else

  const db = createAdminClient()
  const [
    { data: sites }, { data: profiles }, { count: orgs },
    { data: events }, { data: guests }, { data: payments }, { data: messages },
    { data: stds }, { data: memberships }, responseRows,
  ] = await Promise.all([
    db.from('sites').select('id, org_id, title, slug, status, is_unlocked, expires_at, archived_at, created_at').order('created_at', { ascending: false }),
    db.from('profiles').select('id, email, created_at').order('created_at', { ascending: false }).limit(200),
    db.from('organisations').select('id', { count: 'exact', head: true }),
    db.from('events').select('site_id').is('archived_at', null),
    db.from('guests').select('site_id').is('archived_at', null),
    db.from('vendor_payments').select('site_id').is('archived_at', null),
    db.from('messages').select('site_id'),
    db.from('save_the_dates').select('site_id, published'),
    db.from('memberships').select('org_id, role, profiles(id, email)').eq('role', 'owner'),
    // Per-site RSVP totals + last activity for the register (4b) — paged
    // past the 1000-row cap so the counts stay honest at scale.
    fetchAll<{ site_id: string; responded_at: string | null }>(() =>
      db.from('responses').select('site_id, responded_at')),
  ])

  const fmt = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-GB') : '—')
  interface SiteRow { id: string; org_id: string; title: string; slug: string; status: string; is_unlocked: boolean; expires_at: string | null; archived_at: string | null; created_at: string }
  interface ProfileRow { id: string; email: string; created_at: string }
  interface MembershipRow { org_id: string; profiles: { id: string; email: string | null } | { id: string; email: string | null }[] | null }
  const siteRows = (sites ?? []) as SiteRow[]
  const profileRows = (profiles ?? []) as ProfileRow[]

  const eventsBy = countBy(events as { site_id: string }[] | null)
  const guestsBy = countBy(guests as { site_id: string }[] | null)
  const paymentsBy = countBy(payments as { site_id: string }[] | null)
  const messagesBy = countBy(messages as { site_id: string }[] | null)
  const stdBy = new Map<string, boolean>()
  for (const s of (stds ?? []) as { site_id: string; published: boolean }[]) if (s.published) stdBy.set(s.site_id, true)

  const responses = responseRows.length
  const rsvpsBy = countBy(responseRows)
  const lastRsvpBy = new Map<string, string>()
  for (const r of responseRows) {
    if (!r.responded_at) continue
    const prev = lastRsvpBy.get(r.site_id)
    if (!prev || r.responded_at > prev) lastRsvpBy.set(r.site_id, r.responded_at)
  }

  const ownerByOrg = new Map<string, string>()
  const ownerIdByOrg = new Map<string, string>()
  for (const m of (memberships ?? []) as MembershipRow[]) {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    if (p?.email && !ownerByOrg.has(m.org_id)) ownerByOrg.set(m.org_id, p.email)
    if (p?.id && !ownerIdByOrg.has(m.org_id)) ownerIdByOrg.set(m.org_id, p.id)
  }

  const paidSites = siteRows.filter((s) => s.is_unlocked).length
  const liveSites = siteRows.filter((s) => s.status === 'published' && !s.archived_at).length
  const { getUnlockPrice } = await import('@/lib/pricing')
  const price = await getUnlockPrice()
  const revenue = paidSites * price.amount

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <PageHeader eyebrow="Platform admin" title="Mission control"
        description={`Signed in as ${admin.email}. Everything here is platform-wide — handle with care.`} />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Customers" value={orgs ?? 0} />
        <StatCard label="Sites" value={siteRows.length} hint={`${liveSites} live`} />
        <StatCard label="Users" value={profileRows.length} />
        <StatCard label="Unlocked" value={paidSites} />
        <StatCard label="Revenue" value={formatPence(revenue)} hint={`at ${formatPence(price.amount)} / unlock`} />
        <StatCard label="RSVPs" value={responses} />
      </div>

      {/* E4/E5: platform levers — the founder's own controls */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="min-w-56 flex-1">
          <p className="text-[13.5px] font-semibold text-ink">Platform controls</p>
          <p className="text-[12px] text-ink-3">Pricing applies to new checkouts immediately. The directory is what couples see under Vendors → Recommended.</p>
        </div>
        <PriceEditor currentPence={price.amount} />
        <a href="/admin/directory"
          className="rounded-md border border-line bg-paper-2 px-4 py-2 text-[13px] font-medium text-ink hover:border-accent">
          Vendor directory &amp; discounts →
        </a>
      </div>

      <SitesRegister rows={siteRows.map((s) => ({
        id: s.id,
        title: s.title,
        slug: s.slug,
        status: s.status,
        isUnlocked: s.is_unlocked,
        archived: Boolean(s.archived_at),
        ownerEmail: ownerByOrg.get(s.org_id) ?? null,
        ownerId: ownerIdByOrg.get(s.org_id) ?? null,
        joined: fmt(s.created_at),
        expires: fmt(s.expires_at),
        counts: {
          events: eventsBy.get(s.id) ?? 0,
          guests: guestsBy.get(s.id) ?? 0,
          payments: paymentsBy.get(s.id) ?? 0,
          messages: messagesBy.get(s.id) ?? 0,
        },
        rsvps: rsvpsBy.get(s.id) ?? 0,
        lastRsvp: lastRsvpBy.get(s.id) ?? null,
        stdLive: Boolean(stdBy.get(s.id)),
      }))} />

      <section className="mt-9">
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-ink">User accounts</h2>
        <div className="space-y-2">
          {profileRows.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-3.5 shadow-card">
              <span className="text-[13.5px] text-ink">{p.email}
                <span className="ml-2 font-mono text-[9px] uppercase text-ink-3">joined {fmt(p.created_at)}</span></span>
              <ResetButton userId={p.id} email={p.email} />
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-ink-3">
          Percentage discount codes run through Stripe Coupons once live keys are connected —
          create them in the Stripe dashboard; checkout picks them up with promotion codes enabled.
        </p>
      </section>
    </div>
  )
}
