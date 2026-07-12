import { createClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetch-all'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
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

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <PageHeader
        eyebrow="Guests"
        title="Guest list"
        description="Households, named guests, and the invite matrix — who is invited to what drives everything a guest can see and RSVP to."
      />
      <GuestManager
        events={(events ?? []).map((e) => ({
          id: e.id, name: e.name, accent: e.accent, capacity: e.capacity,
          startsAt: e.starts_at, venueName: e.venue_name,
        }))}
        responses={responses.map((r) => ({ guestId: r.guest_id, eventId: r.event_id, status: r.status }))}
        questions={(questions ?? []).map((q) => ({
          id: q.id, eventId: q.event_id, label: q.label, type: q.type, options: (q.options ?? []) as string[],
        }))}
        answers={answers.map((a) => ({ guestId: a.guest_id, questionId: a.question_id, value: a.value }))}
        allocations={(allocations ?? []).map((a) => ({
          householdId: a.household_id, eventId: a.event_id, maxGuests: a.max_guests,
        }))}
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
