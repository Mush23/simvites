'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { randomBytes } from 'node:crypto'

async function gate() {
  const admin = await requirePlatformAdmin()
  if (!admin) throw new Error('Forbidden')
  return createAdminClient()
}

/** Comp / discount: flip a site's unlock without payment (100% discount). */
export async function adminToggleUnlock(siteId: string, unlock: boolean) {
  const db = await gate()
  await db.from('sites').update({ is_unlocked: unlock }).eq('id', siteId)
  await db.from('activity_log').insert({
    site_id: siteId, verb: unlock ? 'admin_comped_unlock' : 'admin_revoked_unlock',
    entity_type: 'site', entity_id: siteId,
  })
  revalidatePath('/admin')
}

/** Archive / restore a site (lifecycle end: public page goes offline, data kept). */
export async function adminArchiveSite(siteId: string, archive: boolean) {
  const db = await gate()
  await db.from('sites').update({ archived_at: archive ? new Date().toISOString() : null }).eq('id', siteId)
  revalidatePath('/admin')
}

/** Extend / set a site's hosting expiry by N months from now. */
export async function adminExtendExpiry(siteId: string, months: number) {
  const db = await gate()
  const d = new Date(); d.setMonth(d.getMonth() + months)
  await db.from('sites').update({ expires_at: d.toISOString(), archived_at: null }).eq('id', siteId)
  revalidatePath('/admin')
}

/** Reset a user's password — returns a one-time temp password to hand over. */
export async function adminResetPassword(userId: string): Promise<{ temp?: string; error?: string }> {
  const db = await gate()
  const temp = `Occasio-${randomBytes(6).toString('base64url')}`
  const { error } = await db.auth.admin.updateUserById(userId, { password: temp })
  if (error) return { error: error.message }
  return { temp }
}
