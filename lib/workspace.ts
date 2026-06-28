import { createClient } from '@/lib/supabase/server'

export interface Workspace {
  siteId: string
  title: string
  slug: string
  orgId: string
  status: string
}

/**
 * The signed-in user's primary site (RLS returns only sites they can access).
 * Phase 1 assumes one site per founder; multi-site selection comes later.
 */
export async function getPrimarySite(): Promise<Workspace | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('sites')
    .select('id, title, slug, org_id, status')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return { siteId: data.id, title: data.title, slug: data.slug, orgId: data.org_id, status: data.status }
}
