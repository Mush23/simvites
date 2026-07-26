import { createClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetch-all'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { SurfaceTabs, INVITE_TABS, withBadge } from '@/components/app/surface-tabs'
import { emailConfigured } from '@/lib/email'
import { deriveInitials, formatEventDateTime } from '@/lib/utils'
import { eventColorMap } from '@/lib/event-colors'
import { InvitationsClient, type HouseholdInviteRow } from './invitations-client'

export const metadata = { title: 'Invitations · Occasio' }

export default async function InvitationsPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()

  const siteId = site!.siteId
  const [households, guests, tokens, { data: sends }, { data: events }, invitations, { data: siteRow }] =
    await Promise.all([
      fetchAll<{ id: string; name: string }>(() =>
        supabase.from('households').select('id, name').eq('site_id', siteId).is('archived_at', null).order('created_at')),
      fetchAll<{ id: string; household_id: string; email: string | null }>(() =>
        supabase.from('guests').select('id, household_id, email').eq('site_id', siteId).is('archived_at', null)),
      fetchAll<{ household_id: string; revoked: boolean }>(() =>
        supabase.from('guest_access_tokens').select('household_id, revoked').eq('site_id', siteId)),
      supabase.from('activity_log').select('entity_id, created_at').eq('site_id', siteId)
        .eq('verb', 'sent_invites').order('created_at', { ascending: false }),
      // The printable invitation shows this household's events + the deadline.
      supabase.from('events').select('id, name, starts_at, venue_name, address, dress_code, accent, sort_order')
        .eq('site_id', siteId).is('archived_at', null).order('sort_order').order('starts_at'),
      fetchAll<{ guest_id: string; event_id: string }>(() =>
        supabase.from('invitations').select('guest_id, event_id').eq('site_id', siteId)),
      supabase.from('sites').select('title, theme, rsvp_deadline_default').eq('id', siteId).maybeSingle(),
    ])
  const { data: opens } = await supabase.from('activity_log')
    .select('entity_id, created_at').eq('site_id', site!.siteId)
    .eq('verb', 'invite_opened').order('created_at', { ascending: false })

  // Built from the FULL ordered event list, then looked up by id — the rows
  // below render a per-household subset, and indexing into that would give the
  // same event a different colour on every household's invitation.
  const eventColors = eventColorMap(events ?? [])

  const householdByGuest = new Map((guests ?? []).map((g) => [g.id, g.household_id]))
  const eventIdsByHousehold = new Map<string, Set<string>>()
  for (const i of invitations) {
    const hh = householdByGuest.get(i.guest_id)
    if (!hh) continue
    const set = eventIdsByHousehold.get(hh) ?? new Set()
    set.add(i.event_id)
    eventIdsByHousehold.set(hh, set)
  }

  const theme = (siteRow?.theme ?? {}) as { initials?: string }
  const siteTitle = siteRow?.title ?? site!.title
  const initials = deriveInitials(siteTitle, theme.initials)
  const deadlineText = siteRow?.rsvp_deadline_default
    ? new Date(siteRow.rsvp_deadline_default).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const rows: HouseholdInviteRow[] = (households ?? []).map((h) => {
    const hhGuests = (guests ?? []).filter((g) => g.household_id === h.id)
    const invited = eventIdsByHousehold.get(h.id) ?? new Set()
    return {
      id: h.id,
      name: h.name,
      guestCount: hhGuests.length,
      emailCount: new Set(hhGuests.map((g) => g.email).filter(Boolean)).size,
      activeLinks: (tokens ?? []).filter((t) => t.household_id === h.id && !t.revoked).length,
      lastSentAt: (sends ?? []).find((s) => s.entity_id === h.id)?.created_at ?? null,
      lastOpenedAt: (opens ?? []).find((o) => o.entity_id === h.id)?.created_at ?? null,
      events: (events ?? []).filter((e) => invited.has(e.id)).map((e) => ({
        name: e.name,
        dateText: formatEventDateTime(e.starts_at) ?? 'Date to follow',
        venue: e.venue_name,
        address: e.address,
        dressCode: e.dress_code,
        accent: eventColors.get(e.id) ?? null,
      })),
    }
  })

  // Same definition the sidebar badge uses: a household with no live link
  // cannot be invited yet.
  const unsentCount = rows.filter((r) => r.activeLinks === 0).length

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <SurfaceTabs tabs={withBadge(INVITE_TABS, '/invitations', unsentCount)} />
      <PageHeader
        eyebrow="Invites & messaging"
        title="Personal links"
        description="Each household gets a private link. Only the link's hash is ever stored — copy it when it appears, or email it directly."
      />
      {!emailConfigured() && (
        <p className="mb-6 rounded-md border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-ink">
          Email isn&apos;t connected yet (no Resend key) — links still work; copy and share them
          by WhatsApp or message. Add <span className="font-mono text-xs">RESEND_API_KEY</span> to enable sending.
        </p>
      )}
      <InvitationsClient rows={rows} siteTitle={siteTitle} initials={initials} deadlineText={deadlineText} />
    </div>
  )
}
