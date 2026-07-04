'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'

const MAX_BYTES = 20 * 1024 * 1024 // 20 MB

/**
 * Upload to the PRIVATE `files` bucket. The storage write uses the service
 * role (bucket has no public policies); tenant safety comes from the path
 * prefix (siteId of the caller's own site) + the RLS-scoped files row that
 * every read/download goes through.
 */
export async function uploadFile(formData: FormData) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'Choose a file first.' }
  if (file.size > MAX_BYTES) return { error: 'Files are limited to 20 MB.' }

  const kind = String(formData.get('kind') ?? 'other')
  const eventId = String(formData.get('event_id') ?? '') || null
  const vendorId = String(formData.get('vendor_id') ?? '') || null

  const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(-120)
  const path = `${site.siteId}/${crypto.randomUUID()}-${safeName}`

  const admin = createAdminClient()
  const { error: upErr } = await admin.storage.from('files').upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (upErr) return { error: upErr.message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('files').insert({
    site_id: site.siteId,
    storage_path: path,
    name: file.name,
    kind,
    event_id: eventId,
    vendor_id: vendorId,
    uploaded_by: user?.id ?? null,
  })
  if (error) {
    await admin.storage.from('files').remove([path]) // don't orphan the blob
    return { error: error.message }
  }

  revalidatePath('/files')
  return { ok: true }
}

export async function deleteFile(fileId: string) {
  const supabase = await createClient()
  // RLS: only members can read the row; only writers can delete it.
  const { data: row } = await supabase.from('files').select('storage_path').eq('id', fileId).maybeSingle()
  if (!row) return { error: 'Not found.' }
  const { error } = await supabase.from('files').delete().eq('id', fileId)
  if (error) return { error: error.message }
  await createAdminClient().storage.from('files').remove([row.storage_path])
  revalidatePath('/files')
  return { ok: true }
}
