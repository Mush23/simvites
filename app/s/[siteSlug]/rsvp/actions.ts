'use server'

import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { GUEST_COOKIE, loadGuestSession } from '@/lib/guest-session'
import { track } from '@/lib/analytics'

export interface EventChoice {
  eventId: string
  status: 'attending' | 'declined'
}
export interface GuestSubmission {
  guestId: string
  choices: EventChoice[]
  /** questionId → value */
  answers: Record<string, unknown>
}
export interface SubmitResult {
  ok?: boolean
  error?: string
  /** guestId:eventId → error for partial failures (e.g. one event filled up) */
  eventErrors?: Record<string, string>
}

// M8/M9 — bounds on everything a guest controls. Generous against any real
// household; the point is that "unbounded" stops being the answer.
const MAX_GUESTS_PER_SUBMISSION = 25
const MAX_EVENTS_PER_GUEST = 25
const MAX_ANSWERS_PER_GUEST = 60
/** Longest single free-text answer. `rsvp_answers.value` is unbounded jsonb
 *  and the schema has no length constraint anywhere, so this is the only cap. */
const MAX_ANSWER_CHARS = 2_000
const MAX_MESSAGE_CHARS = 1_000

/** M11: 'pending' is a valid rsvp_status, and submit_response only applies
 *  capacity, allocation and required-answer checks when the status is
 *  'attending'. The client filters it out; the server did not — so a crafted
 *  submission could reset a guest to "never responded" and skip every guard.
 *  Types are erased at runtime, so this has to be a real check. */
const SUBMITTABLE = new Set(['attending', 'declined'])

/**
 * Clamp one answer value to something storable. Strings are truncated; arrays
 * (multi_choice) are capped and their members truncated; objects are refused
 * outright — no question type produces one, so it can only be someone probing.
 */
function clampAnswer(value: unknown): unknown | undefined {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') return value.slice(0, MAX_ANSWER_CHARS)
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ANSWERS_PER_GUEST)
      .filter((v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
      .map((v) => (typeof v === 'string' ? v.slice(0, MAX_ANSWER_CHARS) : v))
  }
  return undefined
}

const FRIENDLY: [RegExp, string][] = [
  [/event full/, 'This event has just reached capacity.'],
  [/allocation full/, 'Your household’s allocation for this event is full.'],
  [/deadline passed/, 'The RSVP deadline for this event has passed.'],
  [/not invited/, 'You are not invited to this event.'],
  [/missing required answers/, 'Please answer the required questions.'],
]
const friendly = (msg: string) => FRIENDLY.find(([re]) => re.test(msg))?.[1] ?? 'Something went wrong — please try again.'

/**
 * Guest RSVP submit. Trust chain: signed HttpOnly cookie → household →
 * every guest MUST belong to that household → submit_response RPC (service
 * role; the RPC re-enforces invitation, capacity under lock, deadline and
 * required questions server-side).
 */
export async function submitGuestRsvp(
  submissions: GuestSubmission[],
  /** Optional household note for the couple — stored on this submission's
   * responses (original-site port: "a message for the couple"). */
  message?: string,
): Promise<SubmitResult> {
  const session = await loadGuestSession((await cookies()).get(GUEST_COOKIE)?.value)
  if (!session) return { error: 'Your session has expired — please reopen your invitation link.' }
  if (!Array.isArray(submissions) || !submissions.length) return { error: 'Nothing to submit.' }

  // M8: neither array was length-checked, and the loop below makes ONE
  // round-trip per guest × event — each taking a `for update` lock on the
  // event row. The 10/minute limiter capped requests, not work, so a single
  // request could issue thousands of serialised writes and stall every other
  // guest submitting to the same event. A household is a handful of people
  // attending a handful of events; these bounds are far above any real one.
  if (submissions.length > MAX_GUESTS_PER_SUBMISSION) {
    return { error: 'That is more guests than we can process at once.' }
  }
  for (const s of submissions) {
    if (!s || typeof s.guestId !== 'string' || !Array.isArray(s.choices)) {
      return { error: 'Something went wrong — please try again.' }
    }
    if (s.choices.length > MAX_EVENTS_PER_GUEST) {
      return { error: 'That is more events than we can process at once.' }
    }
  }

  const { rateLimit } = await import('@/lib/rate-limit')
  if (!rateLimit(`rsvp:${session.householdId}`, 10, 60_000)) {
    return { error: 'Too many attempts — please wait a minute and try again.' }
  }

  const db = createAdminClient()

  // Every submitted guest must belong to the cookie's household. A forged
  // guestId from another household dies here.
  const { data: householdGuests } = await db
    .from('guests')
    .select('id')
    .eq('household_id', session.householdId)
    .is('archived_at', null)
  const allowed = new Set(((householdGuests ?? []) as { id: string }[]).map((g) => g.id))
  for (const s of submissions) {
    if (!allowed.has(s.guestId)) return { error: 'Invalid guest.' }
  }

  // Map questions to their event scope so each RPC call carries the right answers.
  const { data: questions } = await db
    .from('rsvp_questions')
    .select('id, event_id')
    .eq('site_id', session.siteId)
    .is('archived_at', null)
  const questionScope = new Map(
    ((questions ?? []) as { id: string; event_id: string | null }[]).map((q) => [q.id, q.event_id]),
  )

  const eventErrors: Record<string, string> = {}
  let anySuccess = false

  // Household allocations ("up to N of you") are enforced inside
  // submit_response, under the same event row lock as capacity — race-free,
  // and surfaced per event through the FRIENDLY mapping above.

  for (const s of submissions) {
    // M9: cap the answer map before it is read. Unknown ids are dropped by the
    // scope filter below, but the map itself was unbounded and every value went
    // straight into unbounded jsonb.
    const answerEntries = Object.entries(s.answers ?? {}).slice(0, MAX_ANSWERS_PER_GUEST)

    for (const choice of s.choices) {
      // M11: reject anything that is not a real guest-submittable status.
      if (!choice || typeof choice.eventId !== 'string' || !SUBMITTABLE.has(choice.status)) {
        continue
      }

      const answersForEvent = answerEntries
        .filter(([qid]) => {
          const scope = questionScope.get(qid)
          return scope === undefined ? false : scope === null || scope === choice.eventId
        })
        .map(([qid, value]) => ({ question_id: qid, value: clampAnswer(value) }))
        .filter((a) => a.value !== undefined)

      const { error } = await db.rpc('submit_response', {
        p_guest: s.guestId,
        p_event: choice.eventId,
        p_status: choice.status,
        // Contract with the RPC: null preserves the stored note, '' clears
        // it, text replaces it — an edit never silently wipes the message.
        p_message: message === undefined ? null : message.trim().slice(0, MAX_MESSAGE_CHARS),
        p_custom: {},
        p_answers: answersForEvent,
      })
      if (error) eventErrors[`${s.guestId}:${choice.eventId}`] = friendly(error.message)
      else anySuccess = true
    }
  }

  if (anySuccess) {
    // Funnel event; distinct id = household (guests have no user identity).
    track('rsvp_submitted', session.householdId, { site_id: session.siteId })
  }

  if (Object.keys(eventErrors).length) {
    return { ok: anySuccess, eventErrors }
  }
  return { ok: true }
}
