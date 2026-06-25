'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/** Look up the org that owns a site (RLS ensures the caller is a member). */
async function siteOrg(siteId: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('sites').select('org_id').eq('id', siteId).maybeSingle()
  return { supabase, orgId: data?.org_id as string | undefined }
}

export async function addHousehold(siteId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const code = String(formData.get('code') ?? '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-')
  if (!name || !code) return { error: 'Name and code are required.' }

  const { supabase, orgId } = await siteOrg(siteId)
  if (!orgId) return { error: 'Site not found.' }

  const { error } = await supabase.from('households').insert({
    org_id: orgId,
    site_id: siteId,
    name,
    code,
  })
  if (error) return { error: /duplicate|unique/i.test(error.message) ? 'That code is already used.' : error.message }

  revalidatePath(`/dashboard/sites/${siteId}/guests`)
  return {}
}

export async function addGuest(siteId: string, householdId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const isChild = formData.get('is_child') === 'on'
  if (!name) return { error: 'Guest name is required.' }

  const { supabase, orgId } = await siteOrg(siteId)
  if (!orgId) return { error: 'Site not found.' }

  const { error } = await supabase.from('guests').insert({
    org_id: orgId,
    site_id: siteId,
    household_id: householdId,
    name,
    is_child: isChild,
  })
  if (error) return { error: error.message }

  revalidatePath(`/dashboard/sites/${siteId}/guests`)
  return {}
}

/**
 * Set a household's invite + cap for one event, and cascade the invited flag to
 * every guest in the household (the MVP rule — per-guest exceptions come later).
 */
export async function setHouseholdInvite(
  siteId: string,
  householdId: string,
  eventId: string,
  invited: boolean,
  cap: number,
) {
  const { supabase, orgId } = await siteOrg(siteId)
  if (!orgId) return { error: 'Site not found.' }

  const safeCap = Number.isFinite(cap) && cap >= 0 ? Math.floor(cap) : 0

  const { error: heiError } = await supabase
    .from('household_event_invites')
    .upsert(
      {
        org_id: orgId,
        site_id: siteId,
        household_id: householdId,
        event_id: eventId,
        invited,
        visible: invited,
        household_cap: invited ? Math.max(safeCap, 1) : 0,
      },
      { onConflict: 'household_id,event_id' },
    )
  if (heiError) return { error: heiError.message }

  // Cascade to each guest in the household.
  const { data: guests } = await supabase
    .from('guests')
    .select('id')
    .eq('household_id', householdId)
    .is('deleted_at', null)

  for (const g of guests ?? []) {
    await supabase.from('guest_event_invites').upsert(
      { org_id: orgId, site_id: siteId, guest_id: g.id, event_id: eventId, invited },
      { onConflict: 'guest_id,event_id' },
    )
  }

  revalidatePath(`/dashboard/sites/${siteId}/guests`)
  return {}
}
