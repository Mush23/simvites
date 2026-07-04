'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'

export async function addTable(formData: FormData) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Table name required.' }
  const capacity = Math.max(0, Number(formData.get('capacity') || 10))
  const eventId = String(formData.get('event_id') ?? '') || null
  const supabase = await createClient()
  const { error } = await supabase.from('seating_tables')
    .insert({ site_id: site.siteId, name, capacity, event_id: eventId })
  if (error) return { error: error.message }
  revalidatePath('/seating')
  return { ok: true }
}

export async function deleteTable(tableId: string) {
  const supabase = await createClient()
  await supabase.from('seating_tables').delete().eq('id', tableId)
  revalidatePath('/seating')
  return { ok: true }
}

/** Seat a guest (tableId null = unseat). One seat per guest, capacity enforced. */
export async function seatGuest(guestId: string, tableId: string | null) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const supabase = await createClient()
  await supabase.from('seat_assignments').delete().eq('guest_id', guestId)
  if (tableId) {
    const [{ data: t }, { count }] = await Promise.all([
      supabase.from('seating_tables').select('capacity').eq('id', tableId).maybeSingle(),
      supabase.from('seat_assignments').select('id', { count: 'exact', head: true }).eq('table_id', tableId),
    ])
    if (t && (count ?? 0) >= t.capacity) return { error: 'That table is full.' }
    const { error } = await supabase.from('seat_assignments')
      .insert({ site_id: site.siteId, table_id: tableId, guest_id: guestId })
    if (error) return { error: error.message }
  }
  revalidatePath('/seating')
  return { ok: true }
}
