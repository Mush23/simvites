'use server'

import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { GUEST_COOKIE, verifyGuestSession } from '@/lib/guest-session'
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

const FRIENDLY: [RegExp, string][] = [
  [/event full/, 'This event has just reached capacity.'],
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
export async function submitGuestRsvp(submissions: GuestSubmission[]): Promise<SubmitResult> {
  const session = verifyGuestSession((await cookies()).get(GUEST_COOKIE)?.value)
  if (!session) return { error: 'Your session has expired — please reopen your invitation link.' }
  if (!submissions.length) return { error: 'Nothing to submit.' }

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

  for (const s of submissions) {
    for (const choice of s.choices) {
      const answersForEvent = Object.entries(s.answers)
        .filter(([qid]) => {
          const scope = questionScope.get(qid)
          return scope === undefined ? false : scope === null || scope === choice.eventId
        })
        .map(([qid, value]) => ({ question_id: qid, value }))

      const { error } = await db.rpc('submit_response', {
        p_guest: s.guestId,
        p_event: choice.eventId,
        p_status: choice.status,
        p_message: null,
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
