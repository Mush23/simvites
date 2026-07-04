import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { SeatingManager } from './seating-manager'

export const metadata = { title: 'Seating · Occasio' }

export default async function SeatingPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()

  const [{ data: tables }, { data: seats }, { data: guests }, { data: households }, { data: events }] =
    await Promise.all([
      supabase.from('seating_tables').select('id, name, capacity, event_id').eq('site_id', site!.siteId).order('sort_order').order('created_at'),
      supabase.from('seat_assignments').select('table_id, guest_id').eq('site_id', site!.siteId),
      supabase.from('guests').select('id, full_name, household_id').eq('site_id', site!.siteId).is('archived_at', null).order('created_at'),
      supabase.from('households').select('id, name').eq('site_id', site!.siteId),
      supabase.from('events').select('id, name').eq('site_id', site!.siteId).is('archived_at', null).order('sort_order'),
    ])

  const hh = new Map((households ?? []).map((h) => [h.id, h.name]))

  return (
    <div className="mx-auto max-w-[1060px] px-6 py-10">
      <PageHeader
        eyebrow="Seating"
        title="Who sits where"
        description="Create tables, then place each guest. One seat per guest, capacity enforced."
      />
      <SeatingManager
        tables={(tables ?? []).map((t) => ({
          id: t.id, name: t.name, capacity: t.capacity,
          eventName: (events ?? []).find((e) => e.id === t.event_id)?.name ?? null,
        }))}
        seats={(seats ?? []) as { table_id: string; guest_id: string }[]}
        guests={(guests ?? []).map((g) => ({ id: g.id, name: g.full_name, household: hh.get(g.household_id) ?? '' }))}
        events={(events ?? []) as { id: string; name: string }[]}
      />
    </div>
  )
}
