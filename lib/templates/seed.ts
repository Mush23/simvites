import type { SiteData } from '@/lib/puck/config'
import type { SiteEvent } from '@/components/site/blocks'
import { eventColor } from '@/lib/event-colors'

// Phase 3.3 — seeded preview data.
//
// Never show a template with lorem content. A couple deciding between eighteen
// looks should see THEIR OWN wedding in each one; that single change does more
// for perceived quality than any amount of visual polish. So the same starter
// document gets the couple's real names, date, location and events substituted
// before it renders, in the thumbnail and the full preview alike.
//
// The demo seed below is only for the logged-out marketing gallery. It matches
// the demo wedding in scripts/seed-demo.mjs exactly — Aanya & Dev, Manchester,
// 19 September 2026 — because a contradiction between the marketing mock and
// the seeded product is the first thing visible in any screenshot.

export interface PreviewSeed {
  coupleNames: string
  /** Human date, as the couple would write it. */
  dateText: string
  /** ISO instant for the countdown block, when known. */
  dateISO: string | null
  location: string
  events: SiteEvent[]
  heroPhotoUrl?: string | null
}

function demoEvent(
  i: number, name: string, startsAt: string, venue: string,
): SiteEvent {
  return {
    id: `demo-${i}`,
    name,
    starts_at: startsAt,
    venue_name: venue,
    address: null,
    description: null,
    accent: eventColor(null, i),
  }
}

export const DEMO_SEED: PreviewSeed = {
  coupleNames: 'Aanya & Dev',
  dateText: '19 September 2026',
  dateISO: '2026-09-19T10:30:00Z',
  location: 'Manchester, UK',
  events: [
    demoEvent(0, 'Mehndi', '2026-09-17T16:00:00Z', 'The Garden Room'),
    demoEvent(1, 'Sangeet', '2026-09-18T19:00:00Z', 'Royal Banqueting Hall'),
    demoEvent(2, 'Wedding Ceremony', '2026-09-19T10:30:00Z', 'Heaton Park Pavilion'),
    demoEvent(3, 'Reception', '2026-09-19T18:30:00Z', 'Heaton Park Pavilion'),
  ],
  heroPhotoUrl: null,
}

/**
 * Substitute a seed into a starter document.
 *
 * Only touches the props that name the wedding — the block set, ordering and
 * every styling prop stay exactly as the template declared them. That is what
 * keeps this a preview OF the template rather than a preview of the seed.
 */
export function applySeed(doc: SiteData, seed: PreviewSeed): SiteData {
  // Narrowed per block type rather than spreading an untyped record, so the
  // block's own required props survive and a renamed prop fails the build
  // instead of silently going missing from every preview.
  const content = doc.content.map((block) => {
    if (block.type === 'Hero') {
      return {
        ...block,
        props: {
          ...block.props,
          title: seed.coupleNames,
          dateText: seed.dateText,
          location: seed.location,
          // Only override the image when the seed actually has one; a
          // template's own hero art is part of its identity.
          ...(seed.heroPhotoUrl ? { imageUrl: seed.heroPhotoUrl } : {}),
        },
      }
    }
    if (block.type === 'CountdownBlock' && seed.dateISO) {
      return { ...block, props: { ...block.props, dateISO: seed.dateISO } }
    }
    if (block.type === 'SiteFooterBlock') {
      return { ...block, props: { ...block.props, names: seed.coupleNames } }
    }
    return block
  })
  return { ...doc, content: content as SiteData['content'] }
}

/**
 * The blocks a 4:3 thumbnail can actually show.
 *
 * A thumbnail renders the REAL component tree — same blocks, same config, same
 * theme as the published site — but only the top of the page, because that is
 * all a 4:3 crop displays. Rendering all eighteen templates' full documents
 * in-document would put ~2,000 nodes on the gallery, each with scroll-driven
 * reveals and Ken Burns hero animations, to show pixels nobody can see.
 *
 * Truncating is what keeps the shared-component-tree promise affordable: the
 * thumbnail cannot drift from the published site, because it IS the published
 * site's first screen.
 */
export function thumbDoc(doc: SiteData, blocks = 3): SiteData {
  return { ...doc, content: doc.content.slice(0, blocks) }
}
