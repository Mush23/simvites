import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { PageHeader, StatCard } from '@/components/app/ui'
import { adminToggleUnlock, adminArchiveSite, adminExtendExpiry } from './actions'
import { ResetButton } from './reset-button'
import { UNLOCK_AMOUNT } from '@/lib/stripe'
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
    { data: sites }, { data: profiles }, { count: orgs }, { count: responses },
    { data: events }, { data: guests }, { data: payments }, { data: messages },
    { data: stds }, { data: memberships },
  ] = await Promise.all([
    db.from('sites').select('id, org_id, title, slug, status, is_unlocked, expires_at, archived_at, created_at').order('created_at', { ascending: false }),
    db.from('profiles').select('id, email, created_at').order('created_at', { ascending: false }).limit(200),
    db.from('organisations').select('id', { count: 'exact', head: true }),
    db.from('responses').select('id', { count: 'exact', head: true }),
    db.from('events').select('site_id').is('archived_at', null),
    db.from('guests').select('site_id').is('archived_at', null),
    db.from('vendor_payments').select('site_id').is('archived_at', null),
    db.from('messages').select('site_id'),
    db.from('save_the_dates').select('site_id, published'),
    db.from('memberships').select('org_id, role, profiles(email)').eq('role', 'owner'),
  ])

  const fmt = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-GB') : '—')
  interface SiteRow { id: string; org_id: string; title: string; slug: string; status: string; is_unlocked: boolean; expires_at: string | null; archived_at: string | null; created_at: string }
  interface ProfileRow { id: string; email: string; created_at: string }
  interface MembershipRow { org_id: string; profiles: { email: string | null } | { email: string | null }[] | null }
  const siteRows = (sites ?? []) as SiteRow[]
  const profileRows = (profiles ?? []) as ProfileRow[]

  const eventsBy = countBy(events as { site_id: string }[] | null)
  const guestsBy = countBy(guests as { site_id: string }[] | null)
  const paymentsBy = countBy(payments as { site_id: string }[] | null)
  const messagesBy = countBy(messages as { site_id: string }[] | null)
  const stdBy = new Map<string, boolean>()
  for (const s of (stds ?? []) as { site_id: string; published: boolean }[]) if (s.published) stdBy.set(s.site_id, true)

  const ownerByOrg = new Map<string, string>()
  for (const m of (memberships ?? []) as MembershipRow[]) {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    if (p?.email && !ownerByOrg.has(m.org_id)) ownerByOrg.set(m.org_id, p.email)
  }

  const paidSites = siteRows.filter((s) => s.is_unlocked).length
  const liveSites = siteRows.filter((s) => s.status === 'published' && !s.archived_at).length
  const revenue = paidSites * UNLOCK_AMOUNT

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <PageHeader eyebrow="Platform admin" title="Mission control"
        description={`Signed in as ${admin.email}. Everything here is platform-wide — handle with care.`} />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Customers" value={orgs ?? 0} />
        <StatCard label="Sites" value={siteRows.length} hint={`${liveSites} live`} />
        <StatCard label="Users" value={profileRows.length} />
        <StatCard label="Unlocked" value={paidSites} />
        <StatCard label="Revenue" value={formatPence(revenue)} hint="at £149 / unlock" />
        <StatCard label="RSVPs" value={responses ?? 0} />
      </div>

      <section className="mt-9">
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-ink">Customers &amp; sites</h2>
        <div className="space-y-2.5">
          {siteRows.map((s) => (
            <div key={s.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-52 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[16px] text-ink">{s.title}</span>
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] ${
                      s.archived_at ? 'bg-bad-soft text-bad' : s.status === 'published' ? 'bg-ok-soft text-ok' : 'bg-surface-2 text-ink-3'}`}>
                      {s.archived_at ? 'archived' : s.status}
                    </span>
                    {s.is_unlocked && <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-accent-ink">paid</span>}
                  </div>
                  <p className="mt-0.5 text-[12px] text-ink-3">
                    {ownerByOrg.get(s.org_id) ?? 'no owner email'} · <span className="font-mono">{s.slug}</span> · joined {fmt(s.created_at)} · expires {fmt(s.expires_at)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-ink-3">
                    <span>{eventsBy.get(s.id) ?? 0} events</span>
                    <span>{guestsBy.get(s.id) ?? 0} guests</span>
                    <span>{paymentsBy.get(s.id) ?? 0} payments</span>
                    <span>{messagesBy.get(s.id) ?? 0} messages</span>
                    {stdBy.get(s.id) && <span className="text-accent-ink">save-the-date live</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/s/${s.slug}`} target="_blank"
                    className="rounded-lg border border-line bg-paper-2 px-3 py-1.5 text-xs font-medium text-ink hover:border-line-2">
                    View site ↗
                  </Link>
                  <form action={async () => { 'use server'; await adminToggleUnlock(s.id, !s.is_unlocked) }}>
                    <button type="submit" title="Comp or revoke the paid unlock (a 100% discount)"
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${s.is_unlocked ? 'border border-line bg-paper-2 text-ink-3' : 'bg-accent font-semibold text-white'}`}>
                      {s.is_unlocked ? 'Revoke unlock' : 'Comp unlock'}
                    </button>
                  </form>
                  <form action={async () => { 'use server'; await adminExtendExpiry(s.id, 18) }}>
                    <button type="submit" title="Extend hosting 18 months from today"
                      className="rounded-lg border border-line bg-paper-2 px-3 py-1.5 text-xs font-medium hover:border-line-2">+18 months</button>
                  </form>
                  <form action={async () => { 'use server'; await adminArchiveSite(s.id, !s.archived_at) }}>
                    <button type="submit" title="Archived sites go offline publicly; all data is kept"
                      className="rounded-lg border border-line bg-paper-2 px-3 py-1.5 text-xs font-medium hover:border-line-2">
                      {s.archived_at ? 'Restore' : 'Archive'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
          {siteRows.length === 0 && <p className="text-[13px] text-ink-3">No sites yet.</p>}
        </div>
      </section>

      <section className="mt-9">
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-ink">User accounts</h2>
        <div className="space-y-2">
          {profileRows.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-3.5 shadow-card">
              <span className="text-[13.5px] text-ink">{p.email}
                <span className="ml-2 font-mono text-[9px] uppercase text-ink-3">joined {fmt(p.created_at)}</span></span>
              <ResetButton userId={p.id} />
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
