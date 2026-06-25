import type { Config, Data } from '@puckeditor/core'
import type { EventRecord } from '@/lib/types'
import { Hero } from '@/components/template-one/hero'
import { Story } from '@/components/template-one/story'
import { Events } from '@/components/template-one/events'
import { Schedule } from '@/components/template-one/schedule'
import { RsvpPreview } from '@/components/template-one/rsvp-preview'
import { Footer } from '@/components/template-one/footer'

// Site-level data passed to every block via Puck `metadata` (works in both the
// client editor and the RSC renderer). Events/Schedule blocks read it so the
// multi-event list stays a single source of truth, not duplicated into blocks.
export interface PuckSiteMeta {
  events: EventRecord[]
}

function meta(puck: unknown): PuckSiteMeta {
  const m = (puck as { metadata?: Partial<PuckSiteMeta> } | undefined)?.metadata
  return { events: m?.events ?? [] }
}

// Props for each block (what the user edits in the Puck side panel).
interface HeroProps {
  kicker: string
  titleLeft: string
  titleRight: string
  dateDisplay: string
  location: string
  heroImage: string
}
interface StoryProps {
  kicker: string
  title: string
  paragraphs: { text: string }[]
}
interface RsvpProps {
  deadlineDisplay: string
}
interface FooterProps {
  coupleInitials: string
  dateDisplay: string
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type NoFields = {}

export interface SimvitesBlocks {
  Hero: HeroProps
  Story: StoryProps
  Events: NoFields
  Schedule: NoFields
  Rsvp: RsvpProps
  Footer: FooterProps
}

export const puckConfig: Config<SimvitesBlocks> = {
  components: {
    Hero: {
      label: 'Hero',
      fields: {
        kicker: { type: 'text', label: 'Kicker' },
        titleLeft: { type: 'text', label: 'First name' },
        titleRight: { type: 'text', label: 'Second name' },
        dateDisplay: { type: 'text', label: 'Date' },
        location: { type: 'text', label: 'Location' },
        heroImage: { type: 'text', label: 'Hero image URL' },
      },
      defaultProps: {
        kicker: 'Together with their families',
        titleLeft: 'Your',
        titleRight: 'Names',
        dateDisplay: 'Date',
        location: 'Location',
        heroImage:
          'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=80',
      },
      render: ({ kicker, titleLeft, titleRight, dateDisplay, location, heroImage }) => (
        <Hero
          kicker={kicker}
          titleLeft={titleLeft}
          titleRight={titleRight}
          dateDisplay={dateDisplay}
          location={location}
          heroImage={heroImage}
        />
      ),
    },

    Story: {
      label: 'Story',
      fields: {
        kicker: { type: 'text', label: 'Kicker' },
        title: { type: 'text', label: 'Title' },
        paragraphs: {
          type: 'array',
          label: 'Paragraphs',
          arrayFields: { text: { type: 'textarea', label: 'Text' } },
          getItemSummary: (item) => item.text?.slice(0, 40) || 'Paragraph',
        },
      },
      defaultProps: {
        kicker: 'Our Story',
        title: 'How we got here',
        paragraphs: [{ text: 'Tell your story here.' }],
      },
      render: ({ kicker, title, paragraphs }) => (
        <Story kicker={kicker} title={title} paragraphs={(paragraphs ?? []).map((p) => p.text)} />
      ),
    },

    Events: {
      label: 'Events grid',
      fields: {},
      defaultProps: {},
      render: ({ puck }) => <Events events={meta(puck).events} />,
    },

    Schedule: {
      label: 'Schedule',
      fields: {},
      defaultProps: {},
      render: ({ puck }) => <Schedule events={meta(puck).events} />,
    },

    Rsvp: {
      label: 'RSVP',
      fields: {
        deadlineDisplay: { type: 'text', label: 'RSVP deadline' },
      },
      defaultProps: { deadlineDisplay: '' },
      render: ({ deadlineDisplay }) => (
        <RsvpPreview deadlineDisplay={deadlineDisplay || undefined} />
      ),
    },

    Footer: {
      label: 'Footer',
      fields: {
        coupleInitials: { type: 'text', label: 'Monogram' },
        dateDisplay: { type: 'text', label: 'Date' },
      },
      defaultProps: { coupleInitials: 'M & S', dateDisplay: 'Date' },
      render: ({ coupleInitials, dateDisplay }) => (
        <Footer coupleInitials={coupleInitials} dateDisplay={dateDisplay} />
      ),
    },
  },
}

export type SimvitesData = Data<SimvitesBlocks>
