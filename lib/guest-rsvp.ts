import 'server-only'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetch-all'
import { GUEST_COOKIE, verifyGuestSession } from '@/lib/guest-session'

// Guest RSVP context. Loaded with the SERVICE ROLE after cookie validation —
// guests never hold a Supabase session, and uninvited events are never
// serialised to the client (handoff §5: visibility enforced here, not in CSS).

export interface GuestEventView {
  eventId: string
  name: string
  startsAt: string | null
  venueName: string | null
  /** Event accent colour — powers the keepsake dots (3b). */
  accent: string | null
  deadlinePassed: boolean
  capacityFull: boolean
  status: 'pending' | 'attending' | 'declined'
}
export interface GuestView {
  guestId: string
  fullName: string
  isChild: boolean
  /** "Find your table" — assigned seating, shown once the hosts publish it. */
  tableName?: string
  events: GuestEventView[]
}
export interface QuestionView {
  id: string
  key: string
  label: string
  helpText: string | null
  type: 'yes_no' | 'single_choice' | 'multi_choice' | 'text' | 'meal_choice'
  options: string[]
  required: boolean
  showIf: { question_key: string; equals: unknown } | null
  eventId: string | null // null = whole wedding
}
export interface GuestRsvpContext {
  siteId: string
  siteTitle: string
  householdId: string
  householdName: string
  guests: GuestView[]
  questions: QuestionView[]
  /** guestId → questionId → value */
  answers: Record<string, Record<string, unknown>>
  allDeadlinesPassed: boolean
}

export async function getGuestRsvpContext(siteSlug: string): Promise<GuestRsvpContext | null> {
  const session = verifyGuestSession((await cookies()).get(GUEST_COOKIE)?.value)
  if (!session) return null

  const db = createAdminClient()

  const { data: site } = await db
    .from('sites')
    .select('id, title, rsvp_deadline_default')
    .eq('slug', siteSlug.toLowerCase())
    .maybeSingle()
  if (!site || site.id !== session.siteId) return null

  const { data: household } = await db
    .from('households')
    .select('id, name')
    .eq('id', session.householdId)
    .eq('site_id', site.id)
    .is('archived_at', null)
    .maybeSingle()
  if (!household) return null

  interface GuestRow { id: string; full_name: string; is_child: boolean }
  interface InviteRow { guest_id: string; event_id: string }
  interface EventRow { id: string; name: string; starts_at: string | null; venue_name: string | null; accent: string | null; capacity: number | null; rsvp_deadline: string | null; sort_order: number }
  interface RespRow { guest_id: string; event_id: string; status: string }
  interface QRow { id: string; key: string; label: string; help_text: string | null; type: QuestionView['type']; options: unknown; required: boolean; show_if: unknown; event_id: string | null; sort_order: number }
  interface ARow { guest_id: string; question_id: string; value: unknown }

  // This household's guests first (small, never truncated), then scope the
  // household-specific fetches to those ids — a guest past row 1000 must still
  // see their own invitations. Site-wide responses (for capacity) are paged.
  const { data: guestsRaw } = await db.from('guests').select('id, full_name, is_child')
    .eq('household_id', household.id).is('archived_at', null).order('created_at')
  const householdGuestIds = ((guestsRaw ?? []) as GuestRow[]).map((g) => g.id)

  const [invitationsRaw, { data: eventsRaw }, responsesRaw, { data: questionsRaw }, answersRaw] =
    await Promise.all([
      householdGuestIds.length
        ? db.from('invitations').select('guest_id, event_id').eq('site_id', site.id).in('guest_id', householdGuestIds)
            .then((r: { data: unknown }): InviteRow[] => (r.data ?? []) as InviteRow[])
        : Promise.resolve([] as InviteRow[]),
      db.from('events').select('id, name, starts_at, venue_name, accent, capacity, rsvp_deadline, sort_order')
        .eq('site_id', site.id).is('archived_at', null),
      fetchAll<{ guest_id: string; event_id: string; status: string }>(() =>
        db.from('responses').select('guest_id, event_id, status').eq('site_id', site.id)),
      db.from('rsvp_questions').select('id, key, label, help_text, type, options, required, show_if, event_id, sort_order')
        .eq('site_id', site.id).is('archived_at', null).order('sort_order'),
      householdGuestIds.length
        ? db.from('rsvp_answers').select('guest_id, question_id, value').eq('site_id', site.id).in('guest_id', householdGuestIds)
            .then((r: { data: unknown }): ARow[] => (r.data ?? []) as ARow[])
        : Promise.resolve([] as ARow[]),
    ])

  // Seating: table name per guest (if the hosts have seated them).
  const { data: seatRows } = await db
    .from('seat_assignments')
    .select('guest_id, seating_tables!inner(name)')
    .eq('site_id', site.id)
  const tableByGuest = new Map(
    ((seatRows ?? []) as unknown as { guest_id: string; seating_tables: { name: string } }[])
      .map((s) => [s.guest_id, s.seating_tables.name]),
  )

  const guests = (guestsRaw ?? []) as GuestRow[]
  const invitations = (invitationsRaw ?? []) as InviteRow[]
  const events = (eventsRaw ?? []) as EventRow[]
  const responses = (responsesRaw ?? []) as RespRow[]
  const questions = (questionsRaw ?? []) as QRow[]
  const answers = (answersRaw ?? []) as ARow[]

  const guestIds = new Set(guests.map((g) => g.id))
  const now = Date.now()

  // Attending counts per event, to surface "event full" before submit.
  const attendingCount = new Map<string, number>()
  for (const r of responses ?? []) {
    if (r.status === 'attending') attendingCount.set(r.event_id, (attendingCount.get(r.event_id) ?? 0) + 1)
  }

  const eventById = new Map((events ?? []).map((e) => [e.id, e]))
  const invitedEventIds = new Set<string>()

  const guestViews: GuestView[] = (guests ?? []).map((g) => {
    const invited = (invitations ?? [])
      .filter((i) => i.guest_id === g.id && eventById.has(i.event_id))
      .map((i) => eventById.get(i.event_id)!)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.starts_at).localeCompare(String(b.starts_at)))

    return {
      guestId: g.id,
      fullName: g.full_name,
      isChild: g.is_child,
      tableName: tableByGuest.get(g.id),
      events: invited.map((e) => {
        invitedEventIds.add(e.id)
        const deadline = e.rsvp_deadline ?? site.rsvp_deadline_default
        const mine = (responses ?? []).find((r) => r.guest_id === g.id && r.event_id === e.id)
        const iAmAttending = mine?.status === 'attending'
        return {
          eventId: e.id,
          name: e.name,
          startsAt: e.starts_at,
          venueName: e.venue_name,
          accent: e.accent,
          deadlinePassed: !!deadline && new Date(deadline).getTime() < now,
          capacityFull:
            e.capacity != null && (attendingCount.get(e.id) ?? 0) >= e.capacity && !iAmAttending,
          status: (mine?.status ?? 'pending') as GuestEventView['status'],
        }
      }),
    }
  })

  // Only questions relevant to this household: wedding-wide, or scoped to an
  // event someone here is invited to.
  const questionViews: QuestionView[] = (questions ?? [])
    .filter((q) => q.event_id === null || invitedEventIds.has(q.event_id))
    .map((q) => ({
      id: q.id, key: q.key, label: q.label, helpText: q.help_text,
      type: q.type, options: (q.options as string[]) ?? [],
      required: q.required, showIf: (q.show_if as QuestionView['showIf']) ?? null,
      eventId: q.event_id,
    }))

  const answerMap: GuestRsvpContext['answers'] = {}
  for (const a of answers ?? []) {
    if (!guestIds.has(a.guest_id)) continue
    ;(answerMap[a.guest_id] ??= {})[a.question_id] = a.value
  }

  const allEvents = guestViews.flatMap((g) => g.events)

  return {
    siteId: site.id,
    siteTitle: site.title,
    householdId: household.id,
    householdName: household.name,
    guests: guestViews,
    questions: questionViews,
    answers: answerMap,
    allDeadlinesPassed: allEvents.length > 0 && allEvents.every((e) => e.deadlinePassed),
  }
}
