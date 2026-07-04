import { createAdminClient } from '@/lib/supabase/server'
import type { SiteData } from '@/lib/puck/config'
import type { SiteEvent } from '@/components/site/blocks'

export interface PublishedSnapshot {
  title: string
  slug: string
  theme: Record<string, unknown>
  labels: Record<string, unknown>
  pages: { slug: string; title: string; puck_data: SiteData; is_home: boolean; nav_order: number; hidden: boolean }[]
  events: SiteEvent[]
}

/**
 * Latest published snapshot for a slug, read with the service role (handoff §4).
 * The public path NEVER reads draft tables — only published_versions.
 */
export async function getPublishedSnapshot(slug: string): Promise<PublishedSnapshot | null> {
  const supabase = createAdminClient()

  const { data: site } = await supabase
    .from('sites')
    .select('id, expires_at, archived_at')
    .eq('slug', slug.toLowerCase())
    .eq('status', 'published')
    .maybeSingle()
  if (!site) return null
  // Lifecycle: archived or past-expiry sites are offline (data retained).
  if (site.archived_at) return null
  if (site.expires_at && new Date(site.expires_at) < new Date()) return null

  const { data: version } = await supabase
    .from('published_versions')
    .select('snapshot')
    .eq('site_id', site.id)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!version) return null

  return version.snapshot as PublishedSnapshot
}
