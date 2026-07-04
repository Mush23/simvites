import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { GuestManager } from './guest-manager'

export const metadata = { title: 'Guests · Occasio' }

export default async function GuestsPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()

  const [{ data: events }, { data: households }, { data: guests }, { data: invitations }] =
    await Promise.all([
      supabase.from('events').select('id, name, sort_order').eq('site_id', site!.siteId)
        .is('archived_at', null).order('sort_order').order('starts_at'),
      supabase.from('households').select('id, name, side').eq('site_id', site!.siteId)
        .is('archived_at', null).order('created_at'),
      supabase.from('guests').select('id, household_id, full_name, email, is_child, plus_one_allowed')
        .eq('site_id', site!.siteId).is('archived_at', null).order('created_at'),
      supabase.from('invitations').select('guest_id, event_id').eq('site_id', site!.siteId),
    ])

  return (
    <div className="mx-auto max-w-[1060px] px-6 py-10">
      <PageHeader
        eyebrow="Guests"
        title="Guest list"
        description="Households, named guests, and the invite matrix — who is invited to what drives everything a guest can see and RSVP to."
      />
      <GuestManager
        events={(events ?? []).map((e) => ({ id: e.id, name: e.name }))}
        households={(households ?? []).map((h) => ({
          id: h.id,
          name: h.name,
          side: h.side,
          guests: (guests ?? [])
            .filter((g) => g.household_id === h.id)
            .map((g) => ({
              id: g.id, fullName: g.full_name, email: g.email,
              isChild: g.is_child, plusOneAllowed: g.plus_one_allowed,
              invitedEventIds: (invitations ?? []).filter((i) => i.guest_id === g.id).map((i) => i.event_id),
            })),
        }))}
      />
    </div>
  )
}
