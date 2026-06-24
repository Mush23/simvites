import type { Site } from '@/lib/types'
import { demoSite } from '@/templates/template-one'
import type { TemplateOneContent } from '@/components/template-one'
import { defaultContent } from '@/templates/template-one'

export interface ResolvedSite {
  site: Site
  content: TemplateOneContent
}

/**
 * Resolve a published site by its subdomain slug.
 *
 * STUB: returns the bundled demo until the Supabase project is connected. The
 * real implementation will, server-side with the admin client:
 *   1. select the site by slug where status = 'published'
 *   2. load its published `site_versions.snapshot_json` (events, theme, pages)
 *   3. return null when not found → caller renders notFound()
 */
export async function resolveSiteBySlug(
  slug: string,
): Promise<ResolvedSite | null> {
  // Dev fallback: every slug renders the demo so routing is observable now.
  return { site: { ...demoSite, slug }, content: defaultContent }
}
