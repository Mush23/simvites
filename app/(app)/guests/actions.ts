'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? '').trim()
  return v === '' ? null : v
}

export async function addHousehold(formData: FormData) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const name = str(formData, 'name')
  if (!name) return { error: 'Household name is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('households').insert({
    site_id: site.siteId,
    name,
    side: str(formData, 'side'),
  })
  if (error) return { error: error.message }
  revalidatePath('/guests')
  return { ok: true }
}

export async function addGuest(householdId: string, formData: FormData) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const fullName = str(formData, 'full_name')
  if (!fullName) return { error: 'Guest name is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('guests').insert({
    site_id: site.siteId,
    household_id: householdId,
    full_name: fullName,
    email: str(formData, 'email'),
    is_child: formData.get('is_child') === 'on',
    plus_one_allowed: formData.get('plus_one_allowed') === 'on',
  })
  if (error) return { error: error.message }
  revalidatePath('/guests')
  return { ok: true }
}

export async function archiveGuest(guestId: string) {
  const supabase = await createClient()
  await supabase.from('guests').update({ archived_at: new Date().toISOString() }).eq('id', guestId)
  revalidatePath('/guests')
  return { ok: true }
}

export async function archiveHousehold(householdId: string) {
  const supabase = await createClient()
  const now = new Date().toISOString()
  await supabase.from('guests').update({ archived_at: now }).eq('household_id', householdId)
  await supabase.from('households').update({ archived_at: now }).eq('id', householdId)
  revalidatePath('/guests')
  return { ok: true }
}

/** Toggle one cell of the invite matrix (USP #2: invitation = guest × event). */
export async function setInvitation(guestId: string, eventId: string, invited: boolean) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const supabase = await createClient()

  if (invited) {
    const { error } = await supabase.from('invitations').upsert(
      { site_id: site.siteId, guest_id: guestId, event_id: eventId },
      { onConflict: 'guest_id,event_id', ignoreDuplicates: true },
    )
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('invitations').delete().eq('guest_id', guestId).eq('event_id', eventId)
    if (error) return { error: error.message }
  }
  revalidatePath('/guests')
  return { ok: true }
}

export interface ImportRow {
  household: string
  fullName: string
  email?: string
}

/**
 * Smart parse of a messy pasted guest list. Uses AI when configured
 * (ANTHROPIC_API_KEY) to group households and expand "Raj & Priya Shah"
 * style rows; otherwise falls back to a simple comma parser. Returns the
 * rows plus which path was used, so the UI can tell the host.
 */
export async function parseGuestPaste(text: string): Promise<{ rows: ImportRow[]; usedAi: boolean }> {
  const { parseGuestList, aiConfigured } = await import('@/lib/ai')
  if (aiConfigured()) {
    const ai = await parseGuestList(text)
    if (ai && ai.length) return { rows: ai, usedAi: true }
  }
  // Fallback: one guest per line — "Household, Full name, email(optional)".
  const rows: ImportRow[] = text.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const [household = '', fullName = '', email = ''] = line.split(',').map((s) => s.trim())
    return { household, fullName, email: email || undefined }
  }).filter((r) => r.household && r.fullName)
  return { rows, usedAi: false }
}

/**
 * Paste-import: creates missing households (matched by name, case-insensitive)
 * and guests. Duplicate guests (same name + household) are skipped, never
 * silently overwritten (handoff §8).
 */
export async function importGuests(rows: ImportRow[]) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  if (!rows.length) return { error: 'Nothing to import.' }
  if (rows.length > 500) return { error: 'Import is limited to 500 rows at a time.' }

  const supabase = await createClient()
  const { data: households } = await supabase
    .from('households').select('id, name').eq('site_id', site.siteId).is('archived_at', null)
  const { data: guests } = await supabase
    .from('guests').select('full_name, household_id').eq('site_id', site.siteId).is('archived_at', null)

  const hhByName = new Map((households ?? []).map((h) => [h.name.toLowerCase(), h.id]))
  const existing = new Set((guests ?? []).map((g) => `${g.household_id}:${g.full_name.toLowerCase()}`))

  let createdHouseholds = 0
  let createdGuests = 0
  let skipped = 0

  for (const row of rows) {
    const hhName = row.household.trim()
    const guestName = row.fullName.trim()
    if (!hhName || !guestName) { skipped++; continue }

    let hhId = hhByName.get(hhName.toLowerCase())
    if (!hhId) {
      const { data, error } = await supabase
        .from('households').insert({ site_id: site.siteId, name: hhName }).select('id').single()
      if (error) return { error: `Household "${hhName}": ${error.message}` }
      hhId = data.id
      hhByName.set(hhName.toLowerCase(), hhId)
      createdHouseholds++
    }

    if (existing.has(`${hhId}:${guestName.toLowerCase()}`)) { skipped++; continue }
    const { error } = await supabase.from('guests').insert({
      site_id: site.siteId, household_id: hhId, full_name: guestName, email: row.email?.trim() || null,
    })
    if (error) return { error: `Guest "${guestName}": ${error.message}` }
    existing.add(`${hhId}:${guestName.toLowerCase()}`)
    createdGuests++
  }

  revalidatePath('/guests')
  return { ok: true, summary: `${createdGuests} guests added, ${createdHouseholds} households created, ${skipped} skipped.` }
}
