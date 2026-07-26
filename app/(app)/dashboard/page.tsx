import Link from 'next/link'
import { getPrimarySite } from '@/lib/workspace'
import { computeReadiness, type Readiness } from '@/lib/readiness'
import { PageHeader, StatCard } from '@/components/app/ui'
import { BRAND_NAME } from '@/lib/brand'
import type { SiteStyle } from '@/lib/site-style'

export const metadata = { title: `Command Centre · ${BRAND_NAME}` }

/**
 * First-five-minutes checklist: a linear journey from empty site to sent
 * invitations. Derived from live data (never a stored flag), so it ticks
 * itself off and disappears entirely once the couple is activated.
 */
function GettingStarted({ r, theme, editedSite }: { r: Readiness; theme: SiteStyle; editedSite: boolean }) {
  const met = (key: string) => r.checks.find((c) => c.key === key)?.met ?? false
  // "Choose your look" counts once the couple has worked in the editor (any
  // page draft saved) or published — a couple happy with the default template
  // must be able to tick it without mutating the theme.
  const styled = editedSite || met('published') || Boolean(
    theme.displayFont || theme.bodyFont || theme.buttonStyle || theme.backdrop ||
    theme.customAccent || theme.fontPair || theme.nav ||
    (theme.background && theme.background !== 'template') ||
    (theme.accent && theme.accent !== 'template'),
  )

  const steps = [
    { done: styled, title: 'Choose your look', body: 'Pick a vibe — one tap styles fonts, colours and motion together.', href: '/website', cta: 'Open the editor' },
    { done: met('events') && met('event_details'), title: 'Make the events yours', body: 'Give every celebration its venue, date and time.', href: '/events', cta: 'Edit events' },
    { done: met('guests'), title: 'Build your guest list', body: 'Add households, or paste any spreadsheet and let the importer tidy it.', href: '/guests', cta: 'Add guests' },
    { done: met('published'), title: 'Publish your website', body: 'Nothing goes live until you say so — preview as much as you like.', href: '/website', cta: 'Publish' },
    { done: met('links_out'), title: 'Send the invitations', body: 'Every household gets its own private link — email, WhatsApp or QR.', href: '/invitations', cta: 'Send invites' },
  ]
  const doneCount = steps.filter((s) => s.done).length
  if (doneCount === steps.length) return null
  const current = steps.findIndex((s) => !s.done)

  return (
    <section className="mb-6 rounded-card border border-accent-line bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[14px] font-semibold tracking-tight text-ink">Your path to the big send</p>
        <p className="text-[11px] text-ink-3"><span className="nums">{doneCount}</span> of <span className="nums">{steps.length}</span> done</p>
      </div>
      <ol className="mt-4 grid gap-2.5 lg:grid-cols-5">
        {steps.map((s, i) => {
          const isCurrent = i === current
          return (
            <li key={s.title}
              className={`rounded-[10px] border p-3 ${
                s.done ? 'border-line bg-paper opacity-60'
                : isCurrent ? 'border-accent bg-accent-soft'
                : 'border-line bg-paper'
              }`}>
              {/* "You are here" is a state marker, so it goes ink — the step's
                  own CTA below is the accent on this card, and there is only
                  ever one of those. */}
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10.5px] font-bold ${
                s.done ? 'bg-ok text-white' : isCurrent ? 'bg-ink text-paper' : 'border border-line-2 text-ink-3'
              }`}>
                {s.done ? '✓' : i + 1}
              </span>
              <p className={`mt-2 text-[12.5px] font-semibold leading-tight ${s.done ? 'text-ink-3 line-through' : 'text-ink'}`}>
                {s.title}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-ink-3">{s.body}</p>
              {isCurrent && (
                <Link href={s.href}
                  className="mt-2.5 inline-block rounded-md bg-accent px-3 py-1.5 text-[11.5px] font-semibold text-white">
                  {s.cta} →
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default async function DashboardPage() {
  const site = await getPrimarySite()
  const r = await computeReadiness(site!.siteId)
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const [{ data: siteRow }, { count: editedPages }] = await Promise.all([
    supabase.from('sites').select('theme').eq('id', site!.siteId).maybeSingle(),
    // Any saved page draft = the couple has actually worked in the editor.
    supabase.from('pages').select('id', { count: 'exact', head: true })
      .eq('site_id', site!.siteId).neq('puck_data', '{}'),
  ])
  const theme = (siteRow?.theme ?? {}) as SiteStyle

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

      <GettingStarted r={r} theme={theme} editedSite={(editedPages ?? 0) > 0} />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_2fr]">
        {/* Readiness ring. Progress is neither an action nor an alarm: the arc
            runs neutral while in flight and turns green only when it is
            actually done. It used to render in the brand coral at every value,
            so a 100%-complete ring sat directly above "1 vendor payment
            overdue" in the same colour. */}
        <section className="rounded-card border border-line bg-surface p-6 shadow-card">
          <p className="text-[12px] font-medium text-ink-2">Readiness</p>
          <div className="mt-4 flex items-center gap-5">
            <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0 -rotate-90">
              <circle cx="42" cy="42" r="34" fill="none" stroke="var(--progress-track)" strokeWidth="8" />
              <circle cx="42" cy="42" r="34" fill="none" strokeWidth="8"
                stroke={r.score >= 100 ? 'var(--progress-done)' : 'var(--progress-fill)'}
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
          {/* Reports left the sidebar in Phase 2 — a report is an output you
              ask for, not a place you visit. This is where you ask. */}
          <Link href="/reports"
            className="flex items-center justify-between gap-2 rounded-card border border-dashed border-line bg-paper px-5 py-4 text-[13px] font-medium text-ink-2 transition-colors hover:border-line-2 hover:text-ink sm:col-span-2">
            View the full report
            <span aria-hidden className="text-ink-3">→</span>
          </Link>
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
    // Platform events are log entries, not actions and not outcomes — a quiet
    // neutral dot. Coral here put five brand-red dots down the feed, and green
    // would have claimed the meaning "a guest said yes" already has above.
    ...(log ?? []).map((l) => ({
      at: l.created_at as string,
      color: 'var(--ink-3)',
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
            <span className="shrink-0 text-[10.5px] text-ink-3">{rel(it.at)}</span>
          </p>
        ))}
      </div>
    </section>
  )
}
