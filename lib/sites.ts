import type { EventRecord, Site, SiteTheme } from '@/lib/types'
import type { SimvitesData } from '@/lib/puck/config'
import { createAdminClient } from '@/lib/supabase/server'

export interface ResolvedSite {
  site: Site
  /** The published Puck document for the home page. */
  pageData: SimvitesData
  coupleInitials: string
}

function splitNames(name: string): [string, string] {
  const parts = name.split(/\s*&\s*|\s+and\s+/i)
  if (parts.length >= 2) return [parts[0].trim(), parts.slice(1).join(' & ').trim()]
  return [name.trim(), '']
}

function initials(name: string): string {
  const [a, b] = splitNames(name)
  const i = (s: string) => s.charAt(0).toUpperCase()
  return b ? `${i(a)} & ${i(b)}` : i(a)
}

function mapEvent(e: Record<string, unknown>): EventRecord {
  return {
    id: (e.id as string) ?? '',
    key: e.key as string,
    name: e.name as string,
    tagline: (e.tagline as string) ?? undefined,
    eventDate: (e.event_date as string) ?? undefined,
    startTime: (e.start_time as string) ?? undefined,
    durationHours: (e.duration_hours as number) ?? undefined,
    venue: (e.venue as string) ?? undefined,
    address: (e.address as string) ?? undefined,
    themeLabel: (e.theme_label as string) ?? undefined,
    palette: (e.palette as string[]) ?? [],
    accentToken: (e.accent_token as string) ?? undefined,
    coverImage: (e.cover_image as string) ?? undefined,
    schedule: (e.schedule_json as { time: string; label: string }[]) ?? [],
    order: (e.order as number) ?? 0,
    visible: (e.visible as boolean) ?? true,
  }
}

/**
 * Resolve a PUBLISHED site by subdomain slug from its immutable snapshot
 * (brief §10: the public renderer never reads the mutable draft tables).
 * Uses the service-role client — guests never hold a Supabase session.
 * Returns null when the slug is unknown or the site isn't published yet.
 */
export async function resolveSiteBySlug(slug: string): Promise<ResolvedSite | null> {
  const supabase = createAdminClient()

  const { data: siteRow } = await supabase
    .from('sites')
    .select('id, org_id, event_type, name, slug, status, timezone, rsvp_deadline, published_version_id')
    .eq('slug', slug.toLowerCase())
    .eq('status', 'published')
    .is('deleted_at', null)
    .maybeSingle()

  if (!siteRow || !siteRow.published_version_id) return null

  const { data: version } = await supabase
    .from('site_versions')
    .select('snapshot_json')
    .eq('id', siteRow.published_version_id)
    .maybeSingle()

  if (!version) return null

  const snap = version.snapshot_json as {
    page?: SimvitesData
    events?: Record<string, unknown>[]
    theme?: Record<string, unknown>
    name?: string
  }

  const events = (snap.events ?? []).map(mapEvent)

  const theme: SiteTheme = {
    fontHeading: (snap.theme?.font_heading as string) ?? 'Cormorant Garamond',
    fontBody: (snap.theme?.font_body as string) ?? 'Jost',
    modeDefault: (snap.theme?.mode_default as SiteTheme['modeDefault']) ?? 'system',
    colors: (snap.theme?.color_tokens_jsonb as SiteTheme['colors']) ?? { light: {}, dark: {} },
  }

  const site: Site = {
    id: siteRow.id,
    orgId: siteRow.org_id,
    eventType: siteRow.event_type,
    name: siteRow.name,
    slug: siteRow.slug,
    status: siteRow.status,
    timezone: siteRow.timezone,
    rsvpDeadline: siteRow.rsvp_deadline ?? undefined,
    theme,
    events,
  }

  return {
    site,
    pageData: snap.page ?? { root: { props: {} }, content: [] },
    coupleInitials: initials(snap.name ?? siteRow.name),
  }
}
