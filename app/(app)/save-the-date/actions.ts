'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? '').trim()
  return v === '' ? null : v
}

/** Create-or-update the site's save-the-date (one per site for now). */
export async function saveStd(formData: FormData): Promise<{ ok?: true; error?: string; token?: string }> {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const supabase = await createClient()

  const eventIds = formData.getAll('event_ids').map(String).filter(Boolean)
  const fields = {
    headline: str(formData, 'headline') ?? 'Save the Date',
    names: str(formData, 'names'),
    message: str(formData, 'message'),
    date_text: str(formData, 'date_text'),
    location: str(formData, 'location'),
    photo_url: str(formData, 'photo_url'),
    palette: str(formData, 'palette') ?? 'template',
    event_ids: eventIds,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from('save_the_dates').select('id, share_token').eq('site_id', site.siteId).maybeSingle()

  if (existing) {
    const { error } = await supabase.from('save_the_dates').update(fields).eq('id', existing.id)
    if (error) return { error: error.message }
    revalidatePath('/save-the-date')
    return { ok: true, token: existing.share_token }
  }

  const token = randomBytes(9).toString('base64url')
  const { error } = await supabase.from('save_the_dates').insert({ site_id: site.siteId, share_token: token, ...fields })
  if (error) return { error: error.message }
  revalidatePath('/save-the-date')
  return { ok: true, token }
}

/** Publish / unpublish the public link. */
export async function setStdPublished(published: boolean): Promise<{ ok?: true; error?: string }> {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const supabase = await createClient()
  const { error } = await supabase.from('save_the_dates').update({ published }).eq('site_id', site.siteId)
  if (error) return { error: error.message }
  revalidatePath('/save-the-date')
  return { ok: true }
}
