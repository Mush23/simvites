import type { SiteData } from '@/lib/puck/config'

// ═══════════════════════════════════════════════════════════════════════
// Template registry — a template is DATA: a scoped CSS-variable theme +
// starter Puck document. Public blocks consume the same tokens the platform
// defines (--paper, --ink, --accent, fonts…); a template simply overrides
// them at [data-site-root], so every block works under every template.
//
// #1 Editorial Gold    — the founder's wedding design (maharshipatel.co.uk):
//                        Cormorant Garamond + Jost, cream/gold/deep-red.
// #2 Editorial Luxury  — the commissioned `files/` token system:
//                        Fraunces + Inter, ivory/ink with brass hairlines.
// ═══════════════════════════════════════════════════════════════════════

export interface SiteTemplate {
  key: string
  name: string
  description: string
  /** Three swatches (bg / primary / accent) for pickers. */
  swatches: [string, string, string]
  /** One-word mood, shown under the name in pickers. */
  mood?: string
  /** CSS custom-property overrides applied at the public site root. */
  vars: Record<string, string>
  starterDoc: SiteData
}

/** Picker-safe projection (no starter docs) for client components. */
export interface TemplateListing {
  key: string
  name: string
  description: string
  swatches: [string, string, string]
  mood?: string
}
export function listTemplates(): TemplateListing[] {
  return TEMPLATES.map(({ key, name, description, swatches, mood }) => ({ key, name, description, swatches, mood }))
}

// Fonts are loaded once in app/s/[siteSlug]/layout.tsx via next/font and
// exposed as --f-cormorant / --f-jost / --f-fraunces / --f-inter.

const goldVars: Record<string, string> = {
  // Editorial Gold — ported from the wedding site's OKLCH system.
  '--paper': 'oklch(0.985 0.008 85)',
  '--paper-2': 'oklch(0.955 0.018 80)',
  '--surface': 'oklch(0.995 0.005 90)',
  '--surface-2': 'oklch(0.95 0.015 80)',
  '--ink': 'oklch(0.26 0.03 40)',
  '--ink-2': 'oklch(0.44 0.035 48)',
  '--ink-3': 'oklch(0.53 0.105 70)', // gold-ink for labels (AA on cream)
  '--line': 'oklch(0.9 0.02 75)',
  '--line-2': 'oklch(0.86 0.02 75)',
  '--accent': 'oklch(0.42 0.16 28)', // deep red — primary actions
  '--accent-ink': 'oklch(0.53 0.105 70)', // gold ink — eyebrows/details
  '--accent-soft': 'oklch(0.955 0.026 80)',
  '--accent-line': 'oklch(0.72 0.11 75)', // gold hairline
  // Override both the semantic tokens AND the next/font vars they alias, so
  // the swap works regardless of how @theme inline emits them.
  '--font-display': 'var(--f-cormorant), Georgia, serif',
  '--font-sans': 'var(--f-jost), system-ui, sans-serif',
  '--font-instrument': 'var(--f-cormorant)',
  '--font-hanken': 'var(--f-jost)',
}

const luxuryVars: Record<string, string> = {
  // Editorial Luxury — from files/design-tokens.css (values preserved).
  '--paper': '#F6F1E9', // ivory-100 ground
  '--paper-2': '#EFE8DC', // ivory-200 sunken
  '--surface': '#FBF8F3', // ivory-50
  '--surface-2': '#EFE8DC',
  '--ink': '#211D18', // ink-900
  '--ink-2': '#5C544A', // stone-700
  '--ink-3': '#8A8072', // stone-500
  '--line': '#E0D8CB', // ivory-300 hairline
  '--line-2': '#C4BAAA', // stone-400
  '--accent': '#211D18', // primary is INK, not a colour
  '--accent-ink': '#97753F', // brass-600 accent text
  '--accent-soft': '#F1E7D4',
  '--accent-line': '#B08D57', // brass-500 hairline
  '--font-display': 'var(--f-fraunces), Georgia, serif',
  '--font-sans': 'var(--f-inter), system-ui, sans-serif',
  '--font-instrument': 'var(--f-fraunces)',
  '--font-hanken': 'var(--f-inter)',
}

const goldStarter: SiteData = {
  root: { props: {} },
  content: [
    { type: 'Hero', props: { id: 'hero', kicker: 'Together with their families', title: 'Aanya & Dev', subtitle: '', dateText: '19 September 2026', location: 'Manchester, UK', imageUrl: '' } },
    { type: 'CountdownBlock', props: { id: 'countdown', heading: 'The celebrations begin in', dateISO: '2026-09-19T10:30:00Z' } },
    { type: 'StoryBlock', props: { id: 'story', kicker: 'Our Story', title: 'How we got here', paragraphs: [{ text: 'Two families, two cities, and a love story written across one unforgettable weekend.' }] } },
    { type: 'FamilyBlock', props: { id: 'family', heading: 'With the blessings of', sides: [{ side: 'The Groom', name: 'Dev', parents: 'Son of Anil & Meera' }, { side: 'The Bride', name: 'Aanya', parents: 'Daughter of Raj & Priya' }] } },
    { type: 'Schedule', props: { id: 'schedule', heading: 'The Celebrations' } },
    { type: 'GalleryBlock', props: { id: 'gallery', heading: 'Moments', images: [] } },
    { type: 'HotelTravel', props: { id: 'hotel', heading: 'Stay & Travel', hotelName: '', address: '', blockCode: '', phone: '', bookingUrl: '', notes: '' } },
    { type: 'RsvpCta', props: { id: 'rsvp', heading: 'Kindly RSVP', body: 'We can’t wait to celebrate with you.', buttonText: 'Open your invitation' } },
    { type: 'GiftsNote', props: { id: 'gifts', heading: 'Your presence is the present', body: 'Please, no boxed gifts — your blessings mean the world.' } },
    { type: 'SiteFooterBlock', props: { id: 'footer', names: 'Aanya & Dev', note: 'Made with Occasio' } },
  ],
}

const luxuryStarter: SiteData = {
  root: { props: {} },
  content: [
    { type: 'Hero', props: { id: 'hero', kicker: 'Together with our families', title: 'Aanya & Dev', subtitle: '', dateText: '19 September 2026', location: 'Manchester, UK', imageUrl: '' } },
    { type: 'StoryBlock', props: { id: 'story', kicker: 'Our Story', title: 'A quiet beginning', paragraphs: [{ text: 'It started with a borrowed umbrella and a missed train.' }] } },
    { type: 'Schedule', props: { id: 'schedule', heading: 'The Weekend' } },
    { type: 'HotelTravel', props: { id: 'hotel', heading: 'Travel & Stay', hotelName: '', address: '', blockCode: '', phone: '', bookingUrl: '', notes: '' } },
    { type: 'RsvpCta', props: { id: 'rsvp', heading: 'Kindly respond', body: 'Tell us you’re coming.', buttonText: 'Open your invitation' } },
    { type: 'SiteFooterBlock', props: { id: 'footer', names: 'Aanya & Dev', note: 'Made with Occasio' } },
  ],
}

export const TEMPLATES: SiteTemplate[] = [
  {
    key: 'editorial-gold',
    name: 'Editorial Gold',
    description: 'Cream, gold and deep red with a classic serif — warm, ceremonial, celebratory. The original.',
    swatches: ['#F5EFE3', '#C9A227', '#7A1F1F'],
    mood: 'Ceremonial',
    vars: goldVars,
    starterDoc: goldStarter,
  },
  {
    key: 'editorial-luxury',
    name: 'Editorial Luxury',
    description: 'Warm ivory and ink with brass hairlines — quiet, modern, gallery-calm.',
    swatches: ['#F6F1E9', '#211D18', '#B08D57'],
    mood: 'Gallery-calm',
    vars: luxuryVars,
    starterDoc: luxuryStarter,
  },
]

export const DEFAULT_TEMPLATE_KEY = 'editorial-gold'

export function getTemplate(key: string | null | undefined): SiteTemplate {
  return TEMPLATES.find((t) => t.key === key) ?? TEMPLATES[0]
}
