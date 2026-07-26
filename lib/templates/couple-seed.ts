import { getPrimarySite } from '@/lib/workspace'
import { createClient } from '@/lib/supabase/server'
import { eventColor } from '@/lib/event-colors'
import { DEMO_SEED, type PreviewSeed } from './seed'
import type { SiteEvent } from '@/components/site/blocks'

// Server-only. Builds a PreviewSeed from the signed-in couple's real record so
// every template preview shows THEIR wedding — the single change in Phase 3
// that does most for perceived quality.
//
// Shared by the in-app gallery and the preview iframe route, because a seed
// that differs between the thumbnail and the full preview would reintroduce
// exactly the drift the one-component-tree rule exists to prevent.

export async function coupleSeed(): Promise<PreviewSeed | null> {
  // No session (or no site) → the caller falls back to the demo wedding.
  const site = await getPrimarySite().catch(() => null)
  if (!site) return null

  const supabase = await createClient()
  const [{ data: row }, { data: events }] = await Promise.all([
    supabase.from('sites').select('title').eq('id', site.siteId).maybeSingle(),
    supabase.from('events')
      .select('id, name, starts_at, venue_name, address, description, accent')
      .eq('site_id', site.siteId).is('archived_at', null)
      .order('sort_order').order('starts_at'),
  ])

  const evs: SiteEvent[] = (events ?? []).map((e, i) => ({
    id: e.id,
    name: e.name,
    starts_at: e.starts_at,
    venue_name: e.venue_name,
    address: e.address,
    description: e.description,
    accent: eventColor(e.accent, i),
  }))

  // A couple who has not added events yet would preview an empty schedule and
  // learn nothing about the template, so those blocks borrow the demo set.
  const first = evs.find((e) => e.starts_at)
  return {
    coupleNames: row?.title ?? site.title ?? DEMO_SEED.coupleNames,
    dateText: first?.starts_at
      ? new Date(first.starts_at).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      : DEMO_SEED.dateText,
    dateISO: first?.starts_at ?? null,
    location: evs.find((e) => e.venue_name)?.venue_name ?? DEMO_SEED.location,
    events: evs.length ? evs : DEMO_SEED.events,
    heroPhotoUrl: null,
  }
}
