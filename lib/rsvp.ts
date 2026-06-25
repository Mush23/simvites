import { createAdminClient } from '@/lib/supabase/server'

export interface RsvpEventOption {
  eventId: string
  name: string
  eventDate?: string
  cap: number
}
export interface RsvpGuestRow {
  id: string
  name: string
  isChild: boolean
}
export interface ExistingResponse {
  guestId: string
  eventId: string
  attending: boolean
}
export interface HouseholdRsvpContext {
  household: { id: string; name: string }
  guests: RsvpGuestRow[]
  events: RsvpEventOption[]
  existing: {
    submittedBy?: string
    message?: string
    responses: ExistingResponse[]
  } | null
  deadlinePassed: boolean
}

export interface PublishedSite {
  id: string
  name: string
  timezone: string
  rsvpDeadline?: string
}

/** A published site's identity (for the public RSVP flow). */
export async function getPublishedSite(slug: string): Promise<PublishedSite | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('sites')
    .select('id, name, timezone, rsvp_deadline')
    .eq('slug', slug.toLowerCase())
    .eq('status', 'published')
    .is('deleted_at', null)
    .maybeSingle()
  if (!data) return null
  return {
    id: data.id,
    name: data.name,
    timezone: data.timezone,
    rsvpDeadline: data.rsvp_deadline ?? undefined,
  }
}

function deadlineHasPassed(site: PublishedSite): boolean {
  if (!site.rsvpDeadline) return false
  try {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: site.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
    return today > site.rsvpDeadline.slice(0, 10)
  } catch {
    return false
  }
}

/**
 * Resolve a household by its invite code within a site, returning everything
 * the RSVP form needs: guests, the events the household is invited to (with
 * caps), and any existing active submission to pre-fill.
 */
export async function lookupHouseholdContext(
  site: PublishedSite,
  code: string,
): Promise<HouseholdRsvpContext | null> {
  const supabase = createAdminClient()

  const { data: household } = await supabase
    .from('households')
    .select('id, name')
    .eq('site_id', site.id)
    .eq('code', code.trim().toLowerCase())
    .is('deleted_at', null)
    .maybeSingle()
  if (!household) return null

  const [{ data: guests }, { data: invites }, { data: active }] = await Promise.all([
    supabase.from('guests').select('id, name, is_child').eq('household_id', household.id).is('deleted_at', null).order('created_at'),
    supabase
      .from('household_event_invites')
      .select('event_id, household_cap, invited, events!inner(id, name, event_date, visible, order)')
      .eq('household_id', household.id)
      .eq('invited', true)
      .gt('household_cap', 0),
    supabase.from('rsvp_submissions').select('id, submitted_by, message').eq('household_id', household.id).eq('status', 'active').maybeSingle(),
  ])

  interface InviteJoinRow {
    event_id: string
    household_cap: number
    invited: boolean
    events: { id: string; name: string; event_date: string | null; visible: boolean; order: number }
  }
  interface RankedOption extends RsvpEventOption {
    _order: number
    _visible: boolean
  }

  const events: RsvpEventOption[] = ((invites ?? []) as unknown as InviteJoinRow[])
    .map(
      (i): RankedOption => ({
        eventId: i.events.id,
        name: i.events.name,
        eventDate: i.events.event_date ?? undefined,
        cap: i.household_cap,
        _order: i.events.order,
        _visible: i.events.visible,
      }),
    )
    .filter((e) => e._visible)
    .sort((a, b) => a._order - b._order)
    .map(({ _order, _visible, ...rest }) => rest)

  let existing: HouseholdRsvpContext['existing'] = null
  if (active) {
    const { data: responses } = await supabase
      .from('rsvp_event_responses')
      .select('guest_id, event_id, attending')
      .eq('rsvp_submission_id', active.id)
    existing = {
      submittedBy: active.submitted_by ?? undefined,
      message: active.message ?? undefined,
      responses: ((responses ?? []) as { guest_id: string; event_id: string; attending: boolean }[]).map((r) => ({
        guestId: r.guest_id,
        eventId: r.event_id,
        attending: r.attending,
      })),
    }
  }

  return {
    household: { id: household.id, name: household.name },
    guests: ((guests ?? []) as { id: string; name: string; is_child: boolean }[]).map((g) => ({
      id: g.id,
      name: g.name,
      isChild: g.is_child,
    })),
    events,
    existing,
    deadlinePassed: deadlineHasPassed(site),
  }
}

/** Submit an RSVP through the integrity-enforcing submit_rsvp RPC. */
export async function submitRsvp(
  siteId: string,
  householdId: string,
  submittedBy: string,
  message: string,
  responses: { guest_id: string; event_id: string; attending: boolean }[],
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc('submit_rsvp', {
    p_site_id: siteId,
    p_household_id: householdId,
    p_submitted_by: submittedBy,
    p_message: message,
    p_responses: responses,
  })
  if (error) {
    if (/rsvp_closed/.test(error.message)) return { error: 'RSVPs are now closed.' }
    if (/cap_exceeded/.test(error.message)) return { error: 'You have selected more guests than your invitation allows for one of the events.' }
    return { error: error.message }
  }
  return {}
}
