import type { EventRecord, Site, SiteTheme } from '@/lib/types'
import type { TemplateOneContent } from '@/components/template-one'
import { defaultContent } from '@/templates/template-one'
import { createAdminClient } from '@/lib/supabase/server'
import { formatEventDate } from '@/lib/utils'

export interface ResolvedSite {
  site: Site
  content: TemplateOneContent
}

/** Split "Maharshi & Simran" → ["Maharshi", "Simran"]; tolerant of no "&". */
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

/** Build the Template #1 render content from a site record (until Puck editing). */
function deriveContent(siteName: string, events: EventRecord[], deadline?: string): TemplateOneContent {
  const [titleLeft, titleRight] = splitNames(siteName)
  const wedding = events.find((e) => e.key === 'wedding') ?? events[0]
  return {
    kicker: 'Together with their families',
    titleLeft: titleLeft || siteName,
    titleRight: titleRight || '',
    coupleInitials: initials(siteName),
    dateDisplay: formatEventDate(wedding?.eventDate) ?? '',
    location: defaultContent.location,
    heroImage: defaultContent.heroImage,
    story: {
      kicker: 'Our Story',
      title: 'How we got here',
      paragraphs: [
        `${siteName} would be honoured to have you celebrate with them.`,
        'Explore the events below and let us know which you can join.',
      ],
    },
    rsvpDeadlineDisplay: deadline ? (formatEventDate(deadline) ?? undefined) : undefined,
  }
}

/**
 * Resolve a site by its subdomain slug, reading live data with the service-role
 * client (public guest reads never use the anon client against tenant tables).
 *
 * Phase 1 reads the live draft tables directly so a freshly created site is
 * viewable immediately. Phase 2 switches the public renderer to read ONLY the
 * published `site_versions.snapshot_json`.
 */
export async function resolveSiteBySlug(slug: string): Promise<ResolvedSite | null> {
  const supabase = createAdminClient()

  const { data: siteRow } = await supabase
    .from('sites')
    .select('id, org_id, event_type, name, slug, status, timezone, rsvp_deadline')
    .eq('slug', slug.toLowerCase())
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  if (!siteRow) return null

  const [{ data: eventRows }, { data: themeRow }] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .eq('site_id', siteRow.id)
      .is('deleted_at', null)
      .order('order', { ascending: true }),
    supabase.from('themes').select('*').eq('site_id', siteRow.id).maybeSingle(),
  ])

  const events: EventRecord[] = (eventRows ?? []).map((e: Record<string, unknown>) => ({
    id: e.id as string,
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
  }))

  const theme: SiteTheme = {
    fontHeading: (themeRow?.font_heading as string) ?? 'Cormorant Garamond',
    fontBody: (themeRow?.font_body as string) ?? 'Jost',
    modeDefault: (themeRow?.mode_default as SiteTheme['modeDefault']) ?? 'system',
    colors: (themeRow?.color_tokens_jsonb as SiteTheme['colors']) ?? { light: {}, dark: {} },
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

  return { site, content: deriveContent(siteRow.name, events, siteRow.rsvp_deadline ?? undefined) }
}
