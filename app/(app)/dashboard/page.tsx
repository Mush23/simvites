import Link from 'next/link'
import { getPrimarySite } from '@/lib/workspace'
import { computeReadiness } from '@/lib/readiness'
import { PageHeader, StatCard } from '@/components/app/ui'
import { BRAND_NAME } from '@/lib/brand'

export const metadata = { title: `Command Centre · ${BRAND_NAME}` }

export default async function DashboardPage() {
  const site = await getPrimarySite()
  const r = await computeReadiness(site!.siteId)

  const headline =
    r.score >= 85 ? "You're in great shape."
    : r.score >= 60 ? "You're on track."
    : r.score >= 30 ? 'Good start — keep the momentum.'
    : "Let's get you set up."

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <PageHeader
        eyebrow="Command Centre"
        title={headline}
        description={
          r.attention.length
            ? `${r.attention.length} thing${r.attention.length === 1 ? '' : 's'} need${r.attention.length === 1 ? 's' : ''} a quick look.`
            : 'Everything on the checklist is handled. Enjoy the calm.'
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_2fr]">
        {/* Readiness ring card (overhaul: 84px SVG ring, coral arc) */}
        <section className="rounded-card border border-line bg-surface p-6 shadow-card">
          <p className="text-[12px] font-medium text-ink-2">Readiness</p>
          <div className="mt-4 flex items-center gap-5">
            <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0 -rotate-90">
              <circle cx="42" cy="42" r="34" fill="none" stroke="var(--surface-2)" strokeWidth="8" />
              <circle cx="42" cy="42" r="34" fill="none" stroke="var(--accent)" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(r.score / 100) * 213.6} 213.6`} />
            </svg>
            <div>
              <p className="font-mono text-[26px] font-semibold tracking-tight nums text-ink">{r.score}%</p>
              <p className="text-[12.5px] text-ink-3">ready for the big weekend</p>
            </div>
          </div>

          {r.attention.length > 0 && (
            <div className="mt-5 space-y-1.5">
              {r.attention.slice(0, 5).map((c) => (
                <Link key={c.key} href={c.href}
                  className="flex items-center gap-2.5 rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink transition-colors hover:border-line-2 hover:bg-surface-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
                  <span className="flex-1">{c.label}</span>
                  <span aria-hidden className="text-ink-3">→</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Supporting stats */}
        <div className="grid content-start gap-5 sm:grid-cols-2">
          <StatCard label="Events" value={r.stats.events} hint="celebrations planned" />
          <StatCard label="Guests" value={r.stats.guests}
            hint={`${r.stats.invitedGuests} invited to at least one event`} />
          <StatCard label="Households responded" value={`${r.stats.respondedHouseholds}/${r.stats.households}`}
            bar={r.stats.households ? (r.stats.respondedHouseholds / r.stats.households) * 100 : 0} />
          <StatCard label="Attending" value={r.stats.attending} hint="guest-event confirmations" />
          <StatCard label="Vendors booked" value={r.stats.vendorsBooked} />
          <StatCard label="Open tasks" value={r.stats.openTasks}
            hint={r.stats.overdueTasks ? `${r.stats.overdueTasks} overdue` : 'none overdue'} />
        </div>
      </div>

      <LiveActivity siteId={site!.siteId} />
    </div>
  )
}

/** Live activity — recent RSVPs + platform events, newest first (spec). */
async function LiveActivity({ siteId }: { siteId: string }) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { fetchAll } = await import('@/lib/supabase/fetch-all')
  const [{ data: responses }, { data: log }, guests, { data: events }] = await Promise.all([
    supabase.from('responses').select('guest_id, event_id, status, responded_at')
      .eq('site_id', siteId).not('responded_at', 'is', null)
      .order('responded_at', { ascending: false }).limit(6),
    supabase.from('activity_log').select('verb, created_at')
      .eq('site_id', siteId).order('created_at', { ascending: false }).limit(6),
    fetchAll<{ id: string; full_name: string }>(() =>
      supabase.from('guests').select('id, full_name').eq('site_id', siteId)),
    supabase.from('events').select('id, name, accent').eq('site_id', siteId),
  ])
  const gName = new Map((guests ?? []).map((g) => [g.id, g.full_name]))
  const eById = new Map((events ?? []).map((e) => [e.id, e]))

  const VERB_LABEL: Record<string, string> = {
    published: 'Site published',
    sent_seating_update: 'Seating plan sent to guests',
    admin_comped_unlock: 'Unlock activated',
    admin_revoked_unlock: 'Unlock revoked',
  }

  interface FeedItem { at: string; color: string; text: string }
  const items: FeedItem[] = [
    ...(responses ?? []).map((resp) => ({
      at: resp.responded_at as string,
      color: resp.status === 'attending' ? 'var(--ok)' : resp.status === 'declined' ? 'var(--bad)' : 'var(--warn)',
      text: `${gName.get(resp.guest_id) ?? 'A guest'} ${resp.status === 'attending' ? 'said yes to' : resp.status === 'declined' ? 'declined' : 'answered for'} ${eById.get(resp.event_id)?.name ?? 'an event'}`,
    })),
    ...(log ?? []).map((l) => ({
      at: l.created_at as string,
      color: 'var(--accent)',
      text: VERB_LABEL[l.verb] ?? l.verb.replaceAll('_', ' '),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)

  if (!items.length) return null
  const rel = (iso: string) => {
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.round(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.round(hrs / 24)}d ago`
  }

  return (
    <section className="mt-6 rounded-card border border-line bg-surface p-6 shadow-card">
      <p className="text-[12px] font-medium text-ink-2">Live activity</p>
      <div className="mt-3 space-y-2.5">
        {items.map((it, i) => (
          <p key={i} className="flex items-center gap-2.5 text-[13px] text-ink-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: it.color }} />
            <span className="min-w-0 flex-1 truncate text-ink">{it.text}</span>
            <span className="shrink-0 font-mono text-[10.5px] text-ink-3">{rel(it.at)}</span>
          </p>
        ))}
      </div>
    </section>
  )
}
