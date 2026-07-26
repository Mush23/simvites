import type { SiteData } from '@/lib/puck/config'
import { BRAND_NAME } from '@/lib/brand'

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

/**
 * Style tokens that make templates differ structurally, not just in colour:
 * heading case, button geometry, divider motif and hero alignment. Applied
 * live at the site root and shown in previews so what you preview is what you
 * publish.
 */
export interface TemplateStyle {
  headingCase: 'normal' | 'upper'
  button: 'pill' | 'soft' | 'square'   // 999px | 12px | 3px
  divider: 'line' | 'diamond' | 'double' | 'none'
  heroAlign: 'center' | 'left'
}

const DEFAULT_STYLE: TemplateStyle = { headingCase: 'normal', button: 'soft', divider: 'line', heroAlign: 'center' }

const TEMPLATE_STYLES: Record<string, TemplateStyle> = {
  'editorial-gold': { headingCase: 'normal', button: 'pill', divider: 'line', heroAlign: 'center' },
  'editorial-luxury': { headingCase: 'normal', button: 'soft', divider: 'double', heroAlign: 'center' },
  'midnight-baraat': { headingCase: 'upper', button: 'soft', divider: 'diamond', heroAlign: 'center' },
  'garden-mehndi': { headingCase: 'normal', button: 'soft', divider: 'line', heroAlign: 'center' },
  'gallery-white': { headingCase: 'upper', button: 'square', divider: 'none', heroAlign: 'left' },
  'rose-and-ash': { headingCase: 'normal', button: 'pill', divider: 'diamond', heroAlign: 'center' },
  'rajwada': { headingCase: 'upper', button: 'square', divider: 'double', heroAlign: 'center' },
  'coastline': { headingCase: 'upper', button: 'square', divider: 'line', heroAlign: 'center' },
  'deco-champagne': { headingCase: 'upper', button: 'square', divider: 'double', heroAlign: 'center' },
  'terracotta-sun': { headingCase: 'normal', button: 'soft', divider: 'diamond', heroAlign: 'left' },
  'ink-and-jasmine': { headingCase: 'normal', button: 'square', divider: 'line', heroAlign: 'left' },
  'velvet-sangeet': { headingCase: 'normal', button: 'pill', divider: 'diamond', heroAlign: 'center' },
  // D2 additions
  'peacock-court': { headingCase: 'upper', button: 'pill', divider: 'double', heroAlign: 'center' },
  'saffron-disco': { headingCase: 'upper', button: 'pill', divider: 'diamond', heroAlign: 'center' },
  'lotus-milk': { headingCase: 'normal', button: 'soft', divider: 'none', heroAlign: 'center' },
  'monsoon-ink': { headingCase: 'normal', button: 'square', divider: 'line', heroAlign: 'left' },
  'henna-noir': { headingCase: 'upper', button: 'square', divider: 'diamond', heroAlign: 'center' },
  'marigold-morning': { headingCase: 'normal', button: 'pill', divider: 'line', heroAlign: 'center' },
}
const BUTTON_RADIUS: Record<TemplateStyle['button'], string> = { pill: '999px', soft: '12px', square: '3px' }

export function templateStyle(key: string | null | undefined): TemplateStyle {
  return TEMPLATE_STYLES[key ?? ''] ?? DEFAULT_STYLE
}
export function templateButtonRadius(key: string | null | undefined): string {
  return BUTTON_RADIUS[templateStyle(key).button]
}

/** Picker-safe projection (no starter docs) for client components. */
export interface TemplateListing {
  key: string
  name: string
  description: string
  swatches: [string, string, string]
  mood?: string
  style: TemplateStyle
  /** The display font CSS value, for the preview to render real type. */
  displayFont: string
}
export function listTemplates(): TemplateListing[] {
  return TEMPLATES.map(({ key, name, description, swatches, mood, vars }) => ({
    key, name, description, swatches, mood,
    style: templateStyle(key),
    displayFont: vars['--font-instrument'] ?? 'var(--f-cormorant)',
  }))
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
    { type: 'SiteFooterBlock', props: { id: 'footer', names: 'Aanya & Dev', note: `Made with ${BRAND_NAME}` } },
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
    { type: 'SiteFooterBlock', props: { id: 'footer', names: 'Aanya & Dev', note: `Made with ${BRAND_NAME}` } },
  ],
}

export const TEMPLATES: SiteTemplate[] = [
  {
    key: 'editorial-gold',
    name: 'Golden Hour',
    description: 'Cream, gold and deep red with a classic serif — warm, ceremonial, celebratory. The original.',
    swatches: ['#F5EFE3', '#C9A227', '#7A1F1F'],
    mood: 'Ceremonial',
    vars: goldVars,
    starterDoc: goldStarter,
  },
  {
    key: 'editorial-luxury',
    name: 'Ivory Atelier',
    description: 'Warm ivory and ink with brass hairlines — quiet, modern, gallery-calm.',
    swatches: ['#F6F1E9', '#211D18', '#B08D57'],
    mood: 'Gallery-calm',
    vars: luxuryVars,
    starterDoc: luxuryStarter,
  },
]

// ── Overhaul templates 4a–4j: palette + display face per identity. Body
// face stays Instrument Sans (handoff rule); each overrides the display
// face + full token palette at [data-site-root]. Starter content is the
// shared story-first document — the palette carries the identity. ──────
const face = (v: string) => ({
  '--font-display': `var(${v}), Georgia, serif`,
  '--font-instrument': `var(${v})`,
})

const NEW_TEMPLATES: SiteTemplate[] = [
  {
    key: 'midnight-baraat', name: 'Midnight Baraat', mood: 'Night party',
    description: 'Celestial navy and candlelit gold — the baraat under the stars.',
    swatches: ['#0F1B32', '#EFE6D2', '#D4AF6A'],
    vars: {
      '--paper': '#0F1B32', '--paper-2': '#0B1528', '--surface': '#16233E', '--surface-2': '#1B2A48',
      '--ink': '#EFE6D2', '--ink-2': '#C6BBA2', '--ink-3': '#9A8F78',
      '--line': '#24344F', '--line-2': '#31445F',
      '--accent': '#D4AF6A', '--accent-ink': '#D4AF6A',
      '--accent-soft': 'rgba(212,175,106,0.12)', '--accent-line': 'rgba(212,175,106,0.45)',
      ...face('--f-cormorant'),
    },
    starterDoc: goldStarter,
  },
  {
    key: 'garden-mehndi', name: 'Garden Mehndi', mood: 'Daytime outdoor',
    description: 'Botanical greens on warm parchment — a mehndi under the arch.',
    swatches: ['#F7F5EC', '#2E5339', '#7FA05F'],
    vars: {
      '--paper': '#F7F5EC', '--paper-2': '#EFEDDE', '--surface': '#FCFBF4', '--surface-2': '#EFEDDE',
      '--ink': '#2E5339', '--ink-2': '#4E6A54', '--ink-3': '#71856F',
      '--line': '#DFDCC8', '--line-2': '#CCC9B2',
      '--accent': '#2E5339', '--accent-ink': '#4E7A57',
      '--accent-soft': '#E7EDDD', '--accent-line': '#A9BC8F',
      ...face('--f-marcellus'),
    },
    starterDoc: goldStarter,
  },
  {
    key: 'gallery-white', name: 'Cloud Gallery', mood: 'Photography-led',
    description: 'Pure white, ink type, grey whispers — the photographs do the talking.',
    swatches: ['#FFFFFF', '#111110', '#8C8C88'],
    vars: {
      '--paper': '#FFFFFF', '--paper-2': '#F7F7F5', '--surface': '#FFFFFF', '--surface-2': '#F2F2F0',
      '--ink': '#111110', '--ink-2': '#55554F', '--ink-3': '#8C8C88',
      '--line': '#E9E9E6', '--line-2': '#DCDCD8',
      '--accent': '#111110', '--accent-ink': '#8C8C88',
      '--accent-soft': '#F2F2F0', '--accent-line': '#C9C9C4',
      // Display face stays Instrument Serif (the platform default).
    },
    starterDoc: luxuryStarter,
  },
  {
    key: 'rose-and-ash', name: 'Rose & Ash', mood: 'Romance',
    description: 'Blush petals and burgundy depths — soft, close, candlelit.',
    swatches: ['#F6E7E4', '#6E2231', '#C4808E'],
    vars: {
      '--paper': '#F6E7E4', '--paper-2': '#F0DCD8', '--surface': '#FBF1EF', '--surface-2': '#F0DCD8',
      '--ink': '#3E2228', '--ink-2': '#6E2231', '--ink-3': '#9A6470',
      '--line': '#E6CFCA', '--line-2': '#D6B8B2',
      '--accent': '#6E2231', '--accent-ink': '#6E2231',
      '--accent-soft': '#F3D9DC', '--accent-line': '#C4808E',
      ...face('--f-playfair'),
    },
    starterDoc: goldStarter,
  },
  {
    key: 'rajwada', name: 'Rajwada', mood: 'Jewel-box maximalist',
    description: 'Deep lac red, saffron and rose — a palace wedding at full volume.',
    swatches: ['#7A1024', '#F8EAD8', '#E8A33D'],
    vars: {
      '--paper': '#7A1024', '--paper-2': '#6A0D1F', '--surface': '#8A1B30', '--surface-2': '#94233A',
      '--ink': '#F8EAD8', '--ink-2': '#EBCFB3', '--ink-3': '#D3A98A',
      '--line': '#97303F', '--line-2': '#A94356',
      '--accent': '#E8A33D', '--accent-ink': '#E8A33D',
      '--accent-soft': 'rgba(232,163,61,0.16)', '--accent-line': 'rgba(232,163,61,0.5)',
      ...face('--f-dmserif'),
    },
    starterDoc: goldStarter,
  },
  {
    key: 'coastline', name: 'Salt & Sky', mood: 'Destination',
    description: 'Driftwood sand and sea slate with tracked caps — vows by the water.',
    swatches: ['#F2EDE3', '#3E4E5C', '#5B7485'],
    vars: {
      '--paper': '#F2EDE3', '--paper-2': '#EAE4D6', '--surface': '#F9F5EC', '--surface-2': '#EAE4D6',
      '--ink': '#3E4E5C', '--ink-2': '#5B7485', '--ink-3': '#8395A3',
      '--line': '#DCD5C4', '--line-2': '#C8C0AD',
      '--accent': '#3E4E5C', '--accent-ink': '#5B7485',
      '--accent-soft': '#E4E7E4', '--accent-line': '#9FB0BC',
      ...face('--f-italiana'),
    },
    starterDoc: luxuryStarter,
  },
  {
    key: 'deco-champagne', name: 'Deco Champagne', mood: 'Art deco',
    description: 'Near-black lacquer and champagne rules — Gatsby with a baraat.',
    swatches: ['#16130F', '#F4ECDD', '#E2C892'],
    vars: {
      '--paper': '#16130F', '--paper-2': '#100E0B', '--surface': '#1F1B15', '--surface-2': '#27221A',
      '--ink': '#F4ECDD', '--ink-2': '#CFC3A9', '--ink-3': '#A3987F',
      '--line': '#2E2820', '--line-2': '#3B342A',
      '--accent': '#E2C892', '--accent-ink': '#E2C892',
      '--accent-soft': 'rgba(226,200,146,0.12)', '--accent-line': 'rgba(226,200,146,0.45)',
      ...face('--f-librebodoni'),
    },
    starterDoc: luxuryStarter,
  },
  {
    key: 'terracotta-sun', name: 'Terracotta Sun', mood: 'Boho',
    description: 'Clay, low sun and sage — barefoot ceremonies in golden hour.',
    swatches: ['#F4E9DC', '#7A3B22', '#C4623A'],
    vars: {
      '--paper': '#F4E9DC', '--paper-2': '#EEDFCC', '--surface': '#FAF2E7', '--surface-2': '#EEDFCC',
      '--ink': '#4C2B1B', '--ink-2': '#7A3B22', '--ink-3': '#A2704F',
      '--line': '#E3D2BC', '--line-2': '#D2BDA1',
      '--accent': '#C4623A', '--accent-ink': '#A6512F',
      '--accent-soft': '#F4DFD2', '--accent-line': '#D99B7C',
      ...face('--f-spectral'),
    },
    starterDoc: goldStarter,
  },
  {
    key: 'ink-and-jasmine', name: 'Ink & Jasmine', mood: 'Quiet letter',
    description: 'A letter in ink with one jasmine-green rule — understated and sure.',
    swatches: ['#FBFBF9', '#20211F', '#4E7A57'],
    vars: {
      '--paper': '#FBFBF9', '--paper-2': '#F3F3EF', '--surface': '#FFFFFF', '--surface-2': '#F3F3EF',
      '--ink': '#20211F', '--ink-2': '#55564F', '--ink-3': '#8B8C82',
      '--line': '#E7E7E1', '--line-2': '#D8D8D0',
      '--accent': '#4E7A57', '--accent-ink': '#41684A',
      '--accent-soft': '#E8EFE7', '--accent-line': '#A3BEA6',
      // Instrument Serif display (platform default).
    },
    starterDoc: luxuryStarter,
  },
  {
    key: 'velvet-sangeet', name: 'Velvet Sangeet', mood: 'Afterparty',
    description: 'Plum velvet and copper shimmer — the night the dance floor wins.',
    swatches: ['#2E1836', '#F2E4EE', '#C97E4E'],
    vars: {
      '--paper': '#2E1836', '--paper-2': '#27142E', '--surface': '#3A2144', '--surface-2': '#432A4E',
      '--ink': '#F2E4EE', '--ink-2': '#CFB4C7', '--ink-3': '#A487A0',
      '--line': '#462C52', '--line-2': '#573B63',
      '--accent': '#C97E4E', '--accent-ink': '#D89263',
      '--accent-soft': 'rgba(201,126,78,0.16)', '--accent-line': 'rgba(201,126,78,0.5)',
      ...face('--f-playfair'),
    },
    starterDoc: goldStarter,
  },
  // ── D2: six more, pushing well past "safe" palettes ─────────────────────
  {
    key: 'peacock-court', name: 'Peacock Court', mood: 'Jewel-box regal',
    description: 'Deep teal, emerald and true gold with roman caps — a durbar in full plume.',
    swatches: ['#0D3B3E', '#F2EBD8', '#D9A62E'],
    vars: {
      '--paper': '#0D3B3E', '--paper-2': '#0A3134', '--surface': '#124A4E', '--surface-2': '#17575B',
      '--ink': '#F2EBD8', '--ink-2': '#CBC3A8', '--ink-3': '#9FA087',
      '--line': '#1D5B5F', '--line-2': '#2A6D71',
      '--accent': '#D9A62E', '--accent-ink': '#D9A62E',
      '--accent-soft': 'rgba(217,166,46,0.14)', '--accent-line': 'rgba(217,166,46,0.5)',
      ...face('--f-cinzel'),
    },
    starterDoc: goldStarter,
  },
  {
    key: 'saffron-disco', name: 'Saffron Disco', mood: 'Sangeet party',
    description: 'Hot pink on deep aubergine with saffron flashes — the sangeet that never sits down.',
    swatches: ['#2B1030', '#FFD9EC', '#FF4FA0'],
    vars: {
      '--paper': '#2B1030', '--paper-2': '#240D29', '--surface': '#38173E', '--surface-2': '#431E4A',
      '--ink': '#FFE4F1', '--ink-2': '#E3B7CF', '--ink-3': '#B78AA6',
      '--line': '#4A2352', '--line-2': '#5C2F66',
      '--accent': '#FF4FA0', '--accent-ink': '#FF7AB8',
      '--accent-soft': 'rgba(255,79,160,0.16)', '--accent-line': 'rgba(255,79,160,0.5)',
      ...face('--f-dmserif'),
    },
    starterDoc: goldStarter,
  },
  {
    key: 'lotus-milk', name: 'Lotus Milk', mood: 'Soft minimal',
    description: 'Milk white and lotus pink, barely-there lines — a whisper of a wedding site.',
    swatches: ['#FDFBFA', '#3C3335', '#D98A9E'],
    vars: {
      '--paper': '#FDFBFA', '--paper-2': '#F8F1F2', '--surface': '#FFFFFF', '--surface-2': '#F8F1F2',
      '--ink': '#3C3335', '--ink-2': '#6E6163', '--ink-3': '#9C8D90',
      '--line': '#F0E4E6', '--line-2': '#E2D0D3',
      '--accent': '#D98A9E', '--accent-ink': '#B76B80',
      '--accent-soft': '#FAE9ED', '--accent-line': '#E9BFC9',
      ...face('--f-prata'),
    },
    starterDoc: luxuryStarter,
  },
  {
    key: 'monsoon-ink', name: 'Monsoon Ink', mood: 'Moody letterpress',
    description: 'Storm-grey paper, indigo ink and one silver rule — love letters in the rain.',
    swatches: ['#E9EAEC', '#252A3A', '#66708C'],
    vars: {
      '--paper': '#E9EAEC', '--paper-2': '#DFE1E5', '--surface': '#F4F5F6', '--surface-2': '#DFE1E5',
      '--ink': '#252A3A', '--ink-2': '#4A5164', '--ink-3': '#767D90',
      '--line': '#D2D5DB', '--line-2': '#BFC3CC',
      '--accent': '#3D4560', '--accent-ink': '#4A5478',
      '--accent-soft': '#E2E4EC', '--accent-line': '#9BA3B8',
      ...face('--f-lora'),
    },
    starterDoc: luxuryStarter,
  },
  {
    key: 'henna-noir', name: 'Henna Noir', mood: 'After dark',
    description: 'True black with copper henna warmth — intimate, modern, a little daring.',
    swatches: ['#111010', '#F1E4D4', '#C46A3B'],
    vars: {
      '--paper': '#111010', '--paper-2': '#0B0A0A', '--surface': '#1A1817', '--surface-2': '#242120',
      '--ink': '#F1E4D4', '--ink-2': '#C7B8A5', '--ink-3': '#95897A',
      '--line': '#2B2725', '--line-2': '#3A3431',
      '--accent': '#C46A3B', '--accent-ink': '#D67E4E',
      '--accent-soft': 'rgba(196,106,59,0.14)', '--accent-line': 'rgba(196,106,59,0.5)',
      ...face('--f-librebodoni'),
    },
    starterDoc: luxuryStarter,
  },
  {
    key: 'marigold-morning', name: 'Marigold Morning', mood: 'Daytime joy',
    description: 'Marigold garlands on fresh white with leaf green — haldi-morning happiness.',
    swatches: ['#FFFDF6', '#4C3A12', '#E8A020'],
    vars: {
      '--paper': '#FFFDF6', '--paper-2': '#FBF3DD', '--surface': '#FFFFFF', '--surface-2': '#FBF3DD',
      '--ink': '#4C3A12', '--ink-2': '#7A6234', '--ink-3': '#A08A5C',
      '--line': '#F0E4C4', '--line-2': '#E2D2A6',
      '--accent': '#E8A020', '--accent-ink': '#B97D14',
      '--accent-soft': '#FCF0D6', '--accent-line': '#EFC878',
      ...face('--f-greatvibes'),
    },
    starterDoc: goldStarter,
  },
]
TEMPLATES.push(...NEW_TEMPLATES)

export const DEFAULT_TEMPLATE_KEY = 'editorial-gold'

export function getTemplate(key: string | null | undefined): SiteTemplate {
  return TEMPLATES.find((t) => t.key === key) ?? TEMPLATES[0]
}
