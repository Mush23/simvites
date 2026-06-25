'use server'

import { submitRsvp } from '@/lib/rsvp'

export async function submitRsvpAction(input: {
  siteId: string
  householdId: string
  submittedBy: string
  message: string
  responses: { guest_id: string; event_id: string; attending: boolean }[]
}) {
  return submitRsvp(
    input.siteId,
    input.householdId,
    input.submittedBy,
    input.message,
    input.responses,
  )
}
