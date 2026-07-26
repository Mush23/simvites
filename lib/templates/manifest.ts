import { TEMPLATES, type SiteTemplate } from './registry'

// Phase 3.1 — the manifest layer.
//
// The registry already declared most of what a template is (key, name,
// description, mood, swatches, CSS-var theme, starter doc). This adds the three
// things the gallery and preview shell need and nothing else knew:
//
//   tags          the filter chips, so browsing 18 looks is navigable
//   supportsPhoto whether the hero is built around imagery
//   aspect        thumbnail ratio, so skeletons match the final card exactly
//
// Kept in ONE map beside TEMPLATES rather than threaded through 18 object
// literals: same module, one place to edit when template nineteen arrives, and
// no consumer reads anything about a template from anywhere else.

export type TemplateTag =
  | 'editorial' | 'modern' | 'traditional' | 'jewel'
  | 'minimal' | 'photographic' | 'dark'

/** Chip order in the gallery. Broadest first — how a couple actually narrows. */
export const TAG_ORDER: TemplateTag[] = [
  'editorial', 'minimal', 'modern', 'traditional', 'jewel', 'photographic', 'dark',
]

export const TAG_LABEL: Record<TemplateTag, string> = {
  editorial: 'Editorial',
  minimal: 'Minimal',
  modern: 'Modern',
  traditional: 'Traditional',
  jewel: 'Jewel tones',
  photographic: 'Photo-led',
  dark: 'Dark',
}

interface Facets {
  tags: TemplateTag[]
  supportsPhoto: boolean
  /** [w, h] of the thumbnail box. 4:3 throughout; declared so it is one edit. */
  aspect?: [number, number]
}

const FACETS: Record<string, Facets> = {
  'editorial-gold': { tags: ['traditional', 'editorial'], supportsPhoto: true },
  'editorial-luxury': { tags: ['editorial', 'minimal'], supportsPhoto: true },
  'midnight-baraat': { tags: ['dark', 'jewel'], supportsPhoto: true },
  'garden-mehndi': { tags: ['photographic', 'modern'], supportsPhoto: true },
  'gallery-white': { tags: ['photographic', 'minimal'], supportsPhoto: true },
  'rose-and-ash': { tags: ['editorial', 'minimal'], supportsPhoto: true },
  'rajwada': { tags: ['jewel', 'traditional'], supportsPhoto: false },
  'coastline': { tags: ['photographic', 'modern'], supportsPhoto: true },
  'deco-champagne': { tags: ['editorial', 'jewel'], supportsPhoto: false },
  'terracotta-sun': { tags: ['modern', 'photographic'], supportsPhoto: true },
  'ink-and-jasmine': { tags: ['minimal', 'editorial'], supportsPhoto: false },
  'velvet-sangeet': { tags: ['dark', 'jewel'], supportsPhoto: true },
  'peacock-court': { tags: ['jewel', 'traditional'], supportsPhoto: false },
  'saffron-disco': { tags: ['modern', 'jewel'], supportsPhoto: true },
  'lotus-milk': { tags: ['minimal', 'modern'], supportsPhoto: true },
  'monsoon-ink': { tags: ['dark', 'minimal'], supportsPhoto: false },
  'henna-noir': { tags: ['dark', 'editorial'], supportsPhoto: true },
  'marigold-morning': { tags: ['traditional', 'photographic'], supportsPhoto: true },
}

const DEFAULT_ASPECT: [number, number] = [4, 3]

export interface TemplateManifest {
  id: string
  name: string
  /** The one-word mood, called a tagline in the gallery. */
  tagline: string
  description: string
  /** Maps to the template theme applied at [data-site-root]. */
  themeKey: string
  swatches: [string, string, string]
  tags: TemplateTag[]
  supportsPhoto: boolean
  aspect: [number, number]
}

function toManifest(t: SiteTemplate): TemplateManifest {
  const f = FACETS[t.key]
  return {
    id: t.key,
    name: t.name,
    tagline: t.mood ?? '',
    description: t.description,
    themeKey: t.key,
    swatches: t.swatches,
    // An unfaceted template still appears — it just cannot be filtered to.
    // Better a look you can find than a look silently missing from the grid.
    tags: f?.tags ?? [],
    supportsPhoto: f?.supportsPhoto ?? true,
    aspect: f?.aspect ?? DEFAULT_ASPECT,
  }
}

export const MANIFESTS: TemplateManifest[] = TEMPLATES.map(toManifest)

export function manifestFor(key: string): TemplateManifest | undefined {
  return MANIFESTS.find((m) => m.id === key)
}
