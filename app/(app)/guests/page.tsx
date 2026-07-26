import { createClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetch-all'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { eventColor } from '@/lib/event-colors'
import { GuestManager } from './guest-manager'

export const metadata = { title: 'Guests · Occasio' }

export default async function GuestsPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()
  const siteId = site!.siteId

  // Paginate the sets that can exceed PostgREST's 1000-row cap so the invite
  // matrix stays correct on large guest lists (a truncated fetch would silently
  // drop guests/invitations past row 1000).
  const [{ data: events }, households, guests, invitations, responses, { data: questions }, answers] = await Promise.all([
    supabase.from('events').select('id, name, accent, capacity, starts_at, venue_name, sort_order').eq('site_id', siteId)
      .is('archived_at', null).order('sort_order').order('starts_at'),
    fetchAll<{ id: string; name: string; side: string | null }>(() =>
      supabase.from('households').select('id, name, side').eq('site_id', siteId).is('archived_at', null).order('created_at')),
    fetchAll<{ id: string; household_id: string; full_name: string; email: string | null; is_child: boolean; plus_one_allowed: boolean }>(() =>
      supabase.from('guests').select('id, household_id, full_name, email, is_child, plus_one_allowed').eq('site_id', siteId).is('archived_at', null).order('created_at')),
    fetchAll<{ guest_id: string; event_id: string }>(() =>
      supabase.from('invitations').select('guest_id, event_id').eq('site_id', siteId)),
    // 2c: the lens shows per-event RSVP status, answers and the chase list.
    fetchAll<{ guest_id: string; event_id: string; status: string }>(() =>
      supabase.from('responses').select('guest_id, event_id, status').eq('site_id', siteId)),
    supabase.from('rsvp_questions').select('id, event_id, label, type, options').eq('site_id', siteId)
      .is('archived_at', null).in('type', ['meal_choice', 'single_choice', 'multi_choice', 'yes_no']).order('sort_order'),
    fetchAll<{ guest_id: string; question_id: string; value: unknown }>(() =>
      supabase.from('rsvp_answers').select('guest_id, question_id, value').eq('site_id', siteId)),
  ])
  // Per-household event caps ("up to N guests") — ported from the original.
  const { data: allocations } = await supabase.from('event_allocations')
    .select('household_id, event_id, max_guests').eq('site_id', siteId)
  // Which households have OPENED their invite link — the chase list splits
  // "opened, gone quiet" (hot) from "never opened" (original-site port).
  const { data: opens } = await supabase.from('activity_log')
    .select('entity_id, created_at').eq('site_id', siteId)
    .eq('verb', 'invite_opened').order('created_at', { ascending: false })

  // Group once (O(n)) instead of nested filters (O(households·guests·invites)).
  const guestsByHousehold = new Map<string, typeof guests>()
  for (const g of guests) {
    const arr = guestsByHousehold.get(g.household_id) ?? []
    arr.push(g)
    guestsByHousehold.set(g.household_id, arr)
  }
  const eventsByGuest = new Map<string, string[]>()
  for (const i of invitations) {
    const arr = eventsByGuest.get(i.guest_id) ?? []
    arr.push(i.event_id)
    eventsByGuest.set(i.guest_id, arr)
  }

  // "Answers so far" tallies are aggregated HERE, per event, so the raw
  // answers/questions tables never ride the RSC payload to the client —
  // the lens receives O(events × questions × options), not O(answers).
  const invitedByEvent = new Map<string, Set<string>>()
  for (const i of invitations) {
    const set = invitedByEvent.get(i.event_id) ?? new Set()
    set.add(i.guest_id)
    invitedByEvent.set(i.event_id, set)
  }
  const answersByQuestion = new Map<string, { guestId: string; value: unknown }[]>()
  for (const a of answers) {
    const arr = answersByQuestion.get(a.question_id) ?? []
    arr.push({ guestId: a.guest_id, value: a.value })
    answersByQuestion.set(a.question_id, arr)
  }
  const tallies: Record<string, { label: string; rows: [string, number][] }[]> = {}
  for (const e of events ?? []) {
    const invited = invitedByEvent.get(e.id) ?? new Set()
    tallies[e.id] = (questions ?? [])
      .filter((q) => q.event_id === e.id || q.event_id === null)
      .map((q) => {
        const counts = new Map<string, number>()
        for (const a of answersByQuestion.get(q.id) ?? []) {
          if (!invited.has(a.guestId)) continue
          const vals = Array.isArray(a.value) ? a.value : [a.value]
          for (const v of vals) {
            const label = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v ?? '')
            if (!label) continue
            counts.set(label, (counts.get(label) ?? 0) + 1)
          }
        }
        return { label: q.label, rows: [...counts.entries()].sort((x, y) => y[1] - x[1]) as [string, number][] }
      })
      .filter((t) => t.rows.length > 0)
  }

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <PageHeader
        eyebrow="Guests"
        title="Guest list"
        description="Households, named guests, and the invite matrix — who is invited to what drives everything a guest can see and RSVP to."
      />
      <GuestManager
        events={(events ?? []).map((e, i) => ({
          id: e.id, name: e.name, accent: eventColor(e.accent, i), capacity: e.capacity,
          startsAt: e.starts_at, venueName: e.venue_name,
        }))}
        responses={responses.map((r) => ({ guestId: r.guest_id, eventId: r.event_id, status: r.status }))}
        tallies={tallies}
        allocations={(allocations ?? []).map((a) => ({
          householdId: a.household_id, eventId: a.event_id, maxGuests: a.max_guests,
        }))}
        openedHouseholdIds={[...new Set((opens ?? []).map((o) => o.entity_id as string).filter(Boolean))]}
        households={households.map((h) => ({
          id: h.id,
          name: h.name,
          side: h.side,
          guests: (guestsByHousehold.get(h.id) ?? []).map((g) => ({
            id: g.id, fullName: g.full_name, email: g.email,
            isChild: g.is_child, plusOneAllowed: g.plus_one_allowed,
            invitedEventIds: eventsByGuest.get(g.id) ?? [],
          })),
        }))}
      />
    </div>
  )
}
