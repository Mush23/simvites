import type {
  EventRecord,
  Site,
  SiteTheme,
  TemplateDefinition,
} from '@/lib/types'
import type { TemplateOneContent } from '@/components/template-one'

// ─────────────────────────────────────────────────────────────────────────
// Template #1 — "Editorial Luxe" (ported from the Maharshi & Simran wedding
// site). A template = starter content + default theme + default event
// structure. "Use template" clones this data into a new site; new templates
// are added as data, not code.
// ─────────────────────────────────────────────────────────────────────────

/** Default theme: relies on globals.css tokens, so overrides are empty. */
export const defaultTheme: SiteTheme = {
  fontHeading: 'Cormorant Garamond',
  fontBody: 'Jost',
  modeDefault: 'system',
  colors: { light: {}, dark: {} },
}

/** Starter four-event South Asian wedding structure. */
export const defaultEvents: Omit<EventRecord, 'id'>[] = [
  {
    key: 'sangeet',
    name: 'Sangeet & Jago',
    tagline: 'An evening of music, dance & joy',
    eventDate: 'Wednesday, 21 October 2026',
    startTime: '19:00',
    durationHours: 5,
    venue: 'Horizons Bar & Banqueting',
    address: '39 Whitton Road, Hounslow TW3 2DB',
    themeLabel: 'Blue · Red · Orange',
    palette: ['oklch(0.5 0.16 250)', 'oklch(0.5 0.2 28)', 'oklch(0.68 0.17 55)'],
    accentToken: 'ev-sangeet',
    schedule: [
      { time: '7:00 PM', label: 'Doors open' },
      { time: '8:00 PM', label: 'Sangeet & Jago begins' },
      { time: '12:00 AM', label: 'Celebrations close' },
    ],
    order: 0,
    visible: true,
  },
  {
    key: 'vidhi',
    name: 'Vidhi',
    tagline: 'Ganesh Stapna, Haldi & family blessings',
    eventDate: 'Friday, 23 October 2026',
    startTime: '12:15',
    durationHours: 4,
    venue: 'Beechside',
    address: 'Oldfield Road, Maidenhead SL6 1UA',
    themeLabel: 'Yellow · Gold',
    palette: ['oklch(0.85 0.15 95)', 'oklch(0.72 0.13 80)'],
    accentToken: 'ev-vidhi',
    schedule: [
      { time: '12:15 PM', label: 'Ganesh Stapna' },
      { time: 'Afterwards', label: 'Haldi & Family Blessings' },
      { time: 'To follow', label: 'Lunch' },
    ],
    order: 1,
    visible: true,
  },
  {
    key: 'wedding',
    name: 'Wedding Ceremony',
    tagline: 'Beneath the mandap, the sacred vows',
    eventDate: 'Saturday, 24 October 2026',
    startTime: '10:00',
    durationHours: 4,
    venue: 'Radisson Blu London Heathrow',
    address: '140 Bath Road, Harlington, Hayes UB3 5AW',
    themeLabel: 'Red · Gold',
    palette: ['oklch(0.45 0.18 28)', 'oklch(0.72 0.13 80)'],
    accentToken: 'ev-wedding',
    schedule: [
      { time: '9:30 AM', label: 'Jaan arrival' },
      { time: '10:00 AM', label: 'Ceremony begins' },
      { time: 'Afterwards', label: 'Lunch' },
    ],
    order: 2,
    visible: true,
  },
  {
    key: 'reception',
    name: 'Reception',
    tagline: 'Dinner, dancing & an evening to remember',
    eventDate: 'Saturday, 24 October 2026',
    startTime: '18:00',
    durationHours: 5,
    venue: 'Radisson Blu London Heathrow',
    address: '140 Bath Road, Harlington, Hayes UB3 5AW',
    themeLabel: 'Navy · Gold',
    palette: ['oklch(0.34 0.08 265)', 'oklch(0.72 0.13 80)'],
    accentToken: 'ev-reception',
    schedule: [
      { time: '6:00 PM', label: 'Champagne reception & canapés' },
      { time: '7:30 PM', label: 'Dinner' },
      { time: 'Afterwards', label: 'Dancing' },
    ],
    order: 3,
    visible: true,
  },
]

/** Starter copy for the non-event blocks (hero, story, RSVP). */
export const defaultContent: TemplateOneContent = {
  kicker: 'Together with their families',
  titleLeft: 'Maharshi',
  titleRight: 'Simran',
  coupleInitials: 'M & S',
  dateDisplay: '24 October 2026',
  location: 'London, United Kingdom',
  // Placeholder hero — couples replace this with their own image in the editor.
  heroImage:
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=80',
  story: {
    kicker: 'Our Story',
    title: 'How we got here',
    paragraphs: [
      'Two families, two cities, and a love story written across a single unforgettable weekend in London.',
      'From the first beat of the dhol at the Sangeet to the last dance at the Reception, we would be honoured to have you celebrate every moment with us.',
    ],
  },
  rsvpDeadlineDisplay: '15 July 2026',
}

/** The data-only template record (matches the `templates` table). */
export const templateOne: TemplateDefinition = {
  slug: 'editorial-luxe',
  name: 'Editorial Luxe',
  eventType: 'wedding',
  previewImage: '/templates/editorial-luxe.jpg',
  content: { '/': { content: [], root: {} } }, // Puck data filled in a later sprint
  defaultTheme,
  defaultEvents,
}

/**
 * A fully-resolved demo Site for rendering the template without a database.
 * Used by the apex `/preview` route and the tenant fallback during dev.
 */
export const demoSite: Site = {
  id: 'demo',
  orgId: 'demo',
  eventType: 'wedding',
  name: 'Maharshi & Simran',
  slug: 'demo',
  status: 'published',
  timezone: 'Europe/London',
  rsvpDeadline: '2026-07-15',
  theme: defaultTheme,
  events: defaultEvents.map((e, i) => ({ ...e, id: `demo-${i}` })),
}
