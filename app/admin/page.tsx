import { notFound } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { PageHeader, StatCard } from '@/components/app/ui'
import { ResetButton } from './reset-button'
import { PriceEditor } from './price-editor'
import { SitesRegister } from './sites-register'
import { NeedsYou, DangerZone, type NeedsYouItem } from './ops-widgets'
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
    { data: stds }, { data: memberships }, { data: respStats },
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
    // Per-site RSVP aggregates for the register (4b) + ops feed (4c): one
    // grouped query (O(sites) rows) instead of a full responses fetch.
    db.rpc('admin_response_stats'),
  ])
  // 4c: real platform activity for the ops feed.
  const { data: logRows } = await db.from('activity_log')
    .select('site_id, verb, created_at')
    .in('verb', ['published', 'unlocked', 'sent_invites', 'sent_reminders', 'admin_comped_unlock', 'admin_revoked_unlock'])
    .order('created_at', { ascending: false })
    .limit(20)

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

  interface RespStat { site_id: string; total: number; last_at: string | null; last_day: number }
  const stats = (respStats ?? []) as RespStat[]
  const responses = stats.reduce((n, s) => n + Number(s.total), 0)
  const rsvpsBy = new Map(stats.map((s) => [s.site_id, Number(s.total)]))
  const lastRsvpBy = new Map(stats.filter((s) => s.last_at).map((s) => [s.site_id, s.last_at!]))

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

  // ── 4c: the morning briefing — needs-you rows, danger sites, live feed ──
  const titleBySite = new Map(siteRows.map((s) => [s.id, s.title]))
  const nowMs = Date.now()
  const in45d = new Date(nowMs + 45 * 86400000).toISOString()

  const needs: NeedsYouItem[] = []
  for (const s of siteRows) {
    if (s.archived_at) continue
    if (s.expires_at && s.expires_at < in45d) {
      const days = Math.max(0, Math.ceil((new Date(s.expires_at).getTime() - nowMs) / 86400000))
      needs.push({
        siteId: s.id, title: s.title, kind: 'extend',
        text: days === 0 ? 'live window has expired' : `live window expires in ${days} day${days === 1 ? '' : 's'}`,
      })
    } else if (s.status === 'published' && (guestsBy.get(s.id) ?? 0) > 0 && (rsvpsBy.get(s.id) ?? 0) === 0) {
      needs.push({ siteId: s.id, title: s.title, kind: 'fyi', text: `${guestsBy.get(s.id)} guests, no RSVPs in yet` })
    }
  }
  needs.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'extend' ? -1 : 1))
  const dangerSites = siteRows.filter((s) => !s.archived_at).map((s) => ({ id: s.id, title: s.title, slug: s.slug }))

  interface FeedItem { key: string; tone: 'ok' | 'warn' | 'info' | 'accent'; title?: string; text: string; at: string }
  const feed: FeedItem[] = []
  const VERB_LINE: Record<string, [FeedItem['tone'], string]> = {
    published: ['info', 'published their site'],
    unlocked: ['accent', `paid the unlock — ${formatPence(price.amount)}`],
    sent_invites: ['warn', 'sent invitation links'],
    sent_reminders: ['warn', 'sent RSVP reminders'],
    admin_comped_unlock: ['accent', 'unlock comped by you'],
    admin_revoked_unlock: ['accent', 'unlock revoked by you'],
  }
  for (const l of (logRows ?? []) as { site_id: string; verb: string; created_at: string }[]) {
    const t = titleBySite.get(l.site_id)
    const m = VERB_LINE[l.verb]
    if (!t || !m) continue
    feed.push({ key: `log:${l.verb}:${l.created_at}:${l.site_id}`, tone: m[0], title: t, text: m[1], at: l.created_at })
  }
  for (const s of stats) {
    const n = Number(s.last_day)
    const t = titleBySite.get(s.site_id)
    if (!n || !t || !s.last_at) continue
    feed.push({ key: `rsvp:${s.site_id}`, tone: 'ok', title: t, text: `${n} RSVP${n === 1 ? '' : 's'} in the last day`, at: s.last_at })
  }
  const monthAgo = new Date(nowMs - 30 * 86400000).toISOString()
  for (const s of siteRows) {
    if (s.created_at > monthAgo) feed.push({ key: `new:${s.id}`, tone: 'ok', text: `New site created — ${s.slug}`, at: s.created_at })
  }
  feed.sort((a, b) => b.at.localeCompare(a.at))
  const feedShown = feed.slice(0, 8)
  const ago = (iso: string) => {
    const mins = Math.floor((nowMs - new Date(iso).getTime()) / 60000)
    if (mins < 2) return 'now'
    if (mins < 60) return `${mins}m`
    const h = Math.floor(mins / 60)
    if (h < 24) return `${h}h`
    const d = Math.floor(h / 24)
    return d < 30 ? `${d}d` : new Date(iso).toLocaleDateString('en-GB')
  }

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <PageHeader eyebrow="Platform admin" title="Mission control"
        description={`Signed in as ${admin.email}. Everything here is platform-wide — handle with care.`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Customers" value={orgs ?? 0} />
        <StatCard label="Sites" value={siteRows.length} hint={`${liveSites} live`} />
        <StatCard label="Users" value={profileRows.length} />
        <StatCard label="RSVPs" value={responses} />
      </div>

      {/* 4c: the morning briefing — revenue, needs-you, danger, live feed */}
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <p className="microlabel">Revenue</p>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-[30px] font-semibold tracking-tight text-ink nums">{formatPence(revenue)}</span>
              <span className="text-[12.5px] text-ink-2">
                {paidSites} unlock{paidSites === 1 ? '' : 's'} · {siteRows.length ? Math.round((paidSites / siteRows.length) * 100) : 0}% of {siteRows.length} sites
              </span>
            </p>
            <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-line pt-3.5">
              <span className="text-[12.5px] text-ink-2">Unlock price</span>
              <PriceEditor currentPence={price.amount} />
              <span className="text-[10.5px] text-ink-3">new checkouts only</span>
              <a href="/admin/directory" className="ml-auto text-[12.5px] font-medium text-accent-ink hover:underline">
                Vendor directory &amp; discounts →
              </a>
            </div>
          </section>
          <NeedsYou items={needs.slice(0, 6)} />
          <DangerZone sites={dangerSites} />
        </div>

        <section className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="microlabel mb-2.5">Live across the platform</p>
          {feedShown.length === 0 && (
            <p className="text-[12.5px] text-ink-3">Quiet so far — activity lands here as couples build, publish and collect RSVPs.</p>
          )}
          <div className="flex flex-col gap-2.5">
            {feedShown.map((f) => (
              <p key={f.key} className="flex gap-2.5 text-[12px] leading-relaxed text-ink-2">
                <span className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${
                  f.tone === 'ok' ? 'bg-ok' : f.tone === 'warn' ? 'bg-warn' : f.tone === 'info' ? 'bg-info' : 'bg-accent'}`} />
                <span className="min-w-0">
                  {f.title && <><span className="font-display text-[13px] text-ink">{f.title}</span> — </>}
                  {f.text}{' '}
                  <span className="font-mono text-[9.5px] text-ink-3">{ago(f.at)}</span>
                </span>
              </p>
            ))}
          </div>
          <a href="#sites" className="mt-3 inline-block text-[11.5px] font-medium text-accent-ink hover:underline">All sites ↓</a>
        </section>
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
