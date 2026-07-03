'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? '').trim()
  return v === '' ? null : v
}

export async function createEvent(formData: FormData) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const name = str(formData, 'name')
  if (!name) return { error: 'Event name is required.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .insert({ site_id: site.siteId, name, starts_at: str(formData, 'starts_at') })
    .select('id')
    .single()
  if (error) return { error: error.message }

  revalidatePath('/events')
  redirect(`/events/${data.id}`)
}

export async function updateEvent(eventId: string, formData: FormData) {
  const supabase = await createClient()
  const capacityRaw = str(formData, 'capacity')
  const { error } = await supabase
    .from('events')
    .update({
      name: str(formData, 'name') ?? 'Untitled event',
      starts_at: str(formData, 'starts_at'),
      ends_at: str(formData, 'ends_at'),
      venue_name: str(formData, 'venue_name'),
      address: str(formData, 'address'),
      description: str(formData, 'description'),
      dress_code: str(formData, 'dress_code'),
      host_side: str(formData, 'host_side'),
      visibility: str(formData, 'visibility') ?? 'invite_only',
      capacity: capacityRaw ? Number(capacityRaw) : null,
      on_website: formData.get('on_website') === 'on',
    })
    .eq('id', eventId)
  if (error) return { error: error.message }

  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function archiveEvent(eventId: string) {
  const supabase = await createClient()
  await supabase.from('events').update({ archived_at: new Date().toISOString() }).eq('id', eventId)
  revalidatePath('/events')
  redirect('/events')
}
