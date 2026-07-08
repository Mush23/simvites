'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { publishSnapshot } from '@/lib/publish'

// ── Undo for archives (toast Undo buttons). RLS (can_write_site) scopes
// every write; the table allowlist keeps this endpoint narrow. ──────────

const RESTORABLE = {
  guests: '/guests',
  tasks: '/tasks',
  budget_items: '/budget',
  vendor_payments: '/payments',
} as const

export async function restoreArchived(table: keyof typeof RESTORABLE, id: string) {
  if (!(table in RESTORABLE)) return { error: 'Not restorable.' }
  const supabase = await createClient()
  const { error } = await supabase.from(table).update({ archived_at: null }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(RESTORABLE[table])
  return { ok: true }
}

/**
 * Restore a household AND the guests that were archived with it (they share
 * the household's archive timestamp — guests archived individually earlier
 * stay archived).
 */
export async function restoreHousehold(householdId: string) {
  const supabase = await createClient()
  const { data: hh } = await supabase
    .from('households').select('archived_at').eq('id', householdId).maybeSingle()
  if (!hh?.archived_at) return { ok: true }
  await supabase.from('guests').update({ archived_at: null })
    .eq('household_id', householdId).eq('archived_at', hh.archived_at)
  const { error } = await supabase.from('households').update({ archived_at: null }).eq('id', householdId)
  if (error) return { error: error.message }
  revalidatePath('/guests')
  return { ok: true }
}

/** Header Publish (overhaul): snapshot the saved drafts from any module. */
export async function publishSiteNow(): Promise<{ ok?: true; error?: string; locked?: true }> {
  const workspace = await getPrimarySite()
  if (!workspace) return { error: 'No site.' }
  if (!workspace.isUnlocked) return { error: 'locked', locked: true }
  const res = await publishSnapshot(workspace.siteId, 'Published from the header')
  if ('error' in res && res.error) return { error: res.error }
  revalidatePath('/', 'layout')
  return { ok: true }
}
