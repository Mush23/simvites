import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { SeatingPlanner, type PlannerTable } from './seating-planner'

export const metadata = { title: 'Seating · Occasio' }

export default async function SeatingPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()

  const [{ data: tables }, { data: seats }, { data: guests }, { data: households }, { data: events }, { data: floorplans }] =
    await Promise.all([
      supabase.from('seating_tables').select('id, name, capacity, event_id, pos_x, pos_y, shape').eq('site_id', site!.siteId).order('sort_order').order('created_at'),
      supabase.from('seat_assignments').select('table_id, guest_id').eq('site_id', site!.siteId),
      supabase.from('guests').select('id, full_name, household_id').eq('site_id', site!.siteId).is('archived_at', null).order('created_at'),
      supabase.from('households').select('id, name').eq('site_id', site!.siteId),
      supabase.from('events').select('id, name').eq('site_id', site!.siteId).is('archived_at', null).order('sort_order'),
      supabase.from('seating_floorplans').select('event_id, image_url').eq('site_id', site!.siteId),
    ])

  const hh = new Map((households ?? []).map((h) => [h.id, h.name]))
  const plannerTables: PlannerTable[] = (tables ?? []).map((t) => ({
    id: t.id, name: t.name, capacity: t.capacity, shape: t.shape ?? 'round',
    posX: Number(t.pos_x ?? 50), posY: Number(t.pos_y ?? 50), eventId: t.event_id,
  }))

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          eyebrow="Seating"
          title="Plan the room"
          description="Upload your floor plan or start blank, add tables, then drag them into place and seat each guest. Guests see their table on their personal RSVP page."
        />
        <form action={async () => { 'use server'; await (await import('./actions')).sendSeatingUpdate() }}>
          <button type="submit" title="Email every seated household a fresh personal link — opening it shows their table"
            className="bg-accent px-4 py-2 text-sm font-semibold text-white">
            Send seating plan to guests
          </button>
        </form>
      </div>

      <SeatingPlanner
        tables={plannerTables}
        seats={(seats ?? []) as { table_id: string; guest_id: string }[]}
        guests={(guests ?? []).map((g) => ({ id: g.id, name: g.full_name, household: hh.get(g.household_id) ?? '' }))}
        events={(events ?? []) as { id: string; name: string }[]}
        floorplans={(floorplans ?? []) as { event_id: string | null; image_url: string | null }[]}
      />
    </div>
  )
}
