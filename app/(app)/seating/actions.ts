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

/** Save a table's position on the canvas (percentages, clamped 0–100). */
export async function setTablePosition(tableId: string, x: number, y: number) {
  const supabase = await createClient()
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n * 100) / 100))
  await supabase.from('seating_tables').update({ pos_x: clamp(x), pos_y: clamp(y) }).eq('id', tableId)
  // No revalidate: the client already moved it; a refetch would fight the drag.
  return { ok: true }
}

export async function setTableShape(tableId: string, shape: 'round' | 'rect') {
  const supabase = await createClient()
  await supabase.from('seating_tables').update({ shape }).eq('id', tableId)
  revalidatePath('/seating')
  return { ok: true }
}

/** Upsert the floor-plan background image for an event view (null = all events). */
export async function setFloorplan(eventId: string | null, imageUrl: string | null) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const supabase = await createClient()
  const q = supabase.from('seating_floorplans').select('id').eq('site_id', site.siteId)
  const { data: current } = eventId
    ? await q.eq('event_id', eventId).maybeSingle()
    : await q.is('event_id', null).maybeSingle()
  if (current) {
    await supabase.from('seating_floorplans').update({ image_url: imageUrl }).eq('id', current.id)
  } else {
    await supabase.from('seating_floorplans').insert({ site_id: site.siteId, event_id: eventId, image_url: imageUrl })
  }
  revalidatePath('/seating')
  return { ok: true }
}

/**
 * Push the seating plan to every seated household: an email with a fresh
 * personal link — opening it shows each guest their table on the RSVP page.
 * The founder's "live post-publish updates" promise, delivered.
 */
export async function sendSeatingUpdate() {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  if (!site.isUnlocked) return { error: 'Sending is part of the unlock — see Settings.' }
  const supabase = await createClient()
  const { sendEmail, emailConfigured, escapeHtml } = await import('@/lib/email')
  const { generateGuestToken } = await import('@/lib/tokens')
  const { siteUrl } = await import('@/lib/tenant')

  const [{ data: seats }, { data: guests }] = await Promise.all([
    supabase.from('seat_assignments').select('guest_id').eq('site_id', site.siteId),
    supabase.from('guests').select('id, household_id, email').eq('site_id', site.siteId).is('archived_at', null),
  ])
  const seated = new Set((seats ?? []).map((s) => s.guest_id))
  const householdIds = [...new Set((guests ?? []).filter((g) => seated.has(g.id)).map((g) => g.household_id))]

  let sent = 0
  for (const hid of householdIds) {
    const emails = [...new Set((guests ?? []).filter((g) => g.household_id === hid && g.email).map((g) => g.email as string))]
    if (!emails.length) continue
    const { raw, hash } = generateGuestToken()
    await supabase.from('guest_access_tokens').insert({ site_id: site.siteId, household_id: hid, token_hash: hash })
    const link = `${siteUrl(site.slug)}/i/${raw}`
    for (const to of emails) {
      const res = await sendEmail({
        to,
        subject: `Your table is ready — ${site.title}`,
        html: `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px;color:#2a241d"><h1 style="font-weight:400">The seating plan is live.</h1><p style="line-height:1.65">Open your invitation to see which table you're at:</p><p style="margin:26px 0"><a href="${escapeHtml(link)}" style="background:#b4552d;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:600">Find your table</a></p></div>`,
      })
      if (!res.error && !res.skipped) sent++
    }
  }

  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('activity_log').insert({
    site_id: site.siteId, actor_id: user?.id ?? null, verb: 'sent_seating_update',
    entity_type: 'site', entity_id: site.siteId,
    meta: { households: householdIds.length, delivered: sent, configured: emailConfigured() },
  })
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
