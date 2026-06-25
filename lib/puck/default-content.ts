import type { SimvitesData } from './config'

/**
 * Default Puck document for Template #1 "Editorial Luxe". Cloned into a new
 * site's home page (`pages.content_json`) so the editor opens with the full
 * starter layout the founder customises.
 */
export const editorialLuxeDoc: SimvitesData = {
  root: { props: {} },
  content: [
    {
      type: 'Hero',
      props: {
        id: 'hero-1',
        kicker: 'Together with their families',
        titleLeft: 'Maharshi',
        titleRight: 'Simran',
        dateDisplay: '24 October 2026',
        location: 'London, United Kingdom',
        heroImage:
          'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=80',
      },
    },
    {
      type: 'Story',
      props: {
        id: 'story-1',
        kicker: 'Our Story',
        title: 'How we got here',
        paragraphs: [
          {
            text: 'Two families, two cities, and a love story written across a single unforgettable weekend in London.',
          },
          {
            text: 'From the first beat of the dhol at the Sangeet to the last dance at the Reception, we would be honoured to have you celebrate every moment with us.',
          },
        ],
      },
    },
    { type: 'Events', props: { id: 'events-1' } },
    { type: 'Schedule', props: { id: 'schedule-1' } },
    { type: 'Rsvp', props: { id: 'rsvp-1', deadlineDisplay: '15 July 2026' } },
    {
      type: 'Footer',
      props: { id: 'footer-1', coupleInitials: 'M & S', dateDisplay: '24 October 2026' },
    },
  ],
}

/** True when a stored page document has no usable content (use the default). */
export function isEmptyDoc(data: unknown): boolean {
  const d = data as SimvitesData | null | undefined
  return !d || !Array.isArray(d.content) || d.content.length === 0
}
