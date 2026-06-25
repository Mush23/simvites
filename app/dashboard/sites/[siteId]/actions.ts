'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { SimvitesData } from '@/lib/puck/config'

/** Persist the home page's Puck document as the draft. RLS scopes to the org. */
export async function saveDraft(siteId: string, data: SimvitesData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('pages')
    .update({ content_json: data })
    .eq('site_id', siteId)
    .eq('path', '/')
  if (error) return { error: error.message }
  return {}
}

/** Save the draft, then snapshot + publish via the publish_site RPC. */
export async function saveAndPublish(siteId: string, data: SimvitesData) {
  const saved = await saveDraft(siteId, data)
  if (saved.error) return saved

  const supabase = await createClient()
  const { error } = await supabase.rpc('publish_site', { p_site_id: siteId })
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { published: true }
}
