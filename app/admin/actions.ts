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

// ── E4: vendor directory management (founder-curated, with discounts) ──

export interface DirectoryVendorInput {
  id?: string
  category: string
  name: string
  tagline?: string
  blurb?: string
  location?: string
  price_band?: string
  website?: string
  instagram?: string
  email?: string
  phone?: string
  discount?: string
  promo_code?: string
  featured?: boolean
}

/** Create or update a curated supplier (upsert by id). */
export async function adminSaveDirectoryVendor(v: DirectoryVendorInput) {
  const db = await gate()
  const row = {
    category: v.category.trim().toLowerCase(),
    name: v.name.trim(),
    tagline: v.tagline?.trim() || null,
    blurb: v.blurb?.trim() || null,
    location: v.location?.trim() || null,
    price_band: v.price_band?.trim() || null,
    website: v.website?.trim() || null,
    instagram: v.instagram?.trim() || null,
    email: v.email?.trim() || null,
    phone: v.phone?.trim() || null,
    discount: v.discount?.trim() || null,
    promo_code: v.promo_code?.trim() || null,
    featured: v.featured ?? false,
  }
  if (!row.name || !row.category) return { error: 'Name and category are required.' }
  const { error } = v.id
    ? await db.from('vendor_directory').update(row).eq('id', v.id)
    : await db.from('vendor_directory').insert(row)
  if (error) return { error: error.message }
  revalidatePath('/admin/directory')
  return { ok: true }
}

/** Hide / restore a supplier from every couple's Recommended tab. */
export async function adminArchiveDirectoryVendor(id: string, archive: boolean) {
  const db = await gate()
  await db.from('vendor_directory')
    .update({ archived_at: archive ? new Date().toISOString() : null }).eq('id', id)
  revalidatePath('/admin/directory')
}

// ── E5: platform pricing, editable without a deploy ──

export async function adminSetUnlockPrice(amountPounds: number) {
  const db = await gate()
  const pence = Math.round(amountPounds * 100)
  if (!Number.isFinite(pence) || pence < 100 || pence > 100000) {
    return { error: 'Price must be between £1 and £1,000.' }
  }
  const { error } = await db.from('platform_settings').upsert({
    key: 'unlock_price',
    value: { amount: pence, currency: 'gbp', label: 'Wedding package' },
    updated_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}
