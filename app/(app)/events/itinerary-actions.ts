'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? '').trim()
  return v === '' ? null : v
}

export async function addItineraryItem(eventId: string, formData: FormData) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const title = str(formData, 'title')
  if (!title) return { error: 'Give the moment a name.' }

  const supabase = await createClient()
  const { data: last } = await supabase
    .from('event_itinerary').select('sort_order').eq('event_id', eventId)
    .order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const nextOrder = (last?.sort_order ?? -1) + 1

  const { error } = await supabase.from('event_itinerary').insert({
    site_id: site.siteId, event_id: eventId,
    time_label: str(formData, 'time_label'), title, note: str(formData, 'note'),
    sort_order: nextOrder,
  })
  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function deleteItineraryItem(id: string, eventId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('event_itinerary').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

/** Nudge an item up or down in the running order (swap sort_order with neighbour). */
export async function moveItineraryItem(id: string, eventId: string, dir: 'up' | 'down') {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('event_itinerary').select('id, sort_order').eq('event_id', eventId).order('sort_order')
  if (!items) return { error: 'Not found.' }
  const idx = items.findIndex((i) => i.id === id)
  const swapIdx = dir === 'up' ? idx - 1 : idx + 1
  if (idx < 0 || swapIdx < 0 || swapIdx >= items.length) return { ok: true }
  const a = items[idx], b = items[swapIdx]
  await Promise.all([
    supabase.from('event_itinerary').update({ sort_order: b.sort_order }).eq('id', a.id),
    supabase.from('event_itinerary').update({ sort_order: a.sort_order }).eq('id', b.id),
  ])
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}
