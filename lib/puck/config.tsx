import type { Config, Data } from '@puckeditor/core'
import {
  SiteHero, SiteSchedule, SiteEventDetail, SiteRsvpCta, SiteTravel, SiteFaq, SiteFooter,
  type SiteEvent,
} from '@/components/site/blocks'

export interface PuckSiteMeta {
  events: SiteEvent[]
}
function metaEvents(puck: unknown): SiteEvent[] {
  return (puck as { metadata?: Partial<PuckSiteMeta> } | undefined)?.metadata?.events ?? []
}

interface HeroProps { kicker: string; title: string; subtitle: string; dateText: string; location: string; imageUrl: string }
interface ScheduleProps { heading: string }
interface EventDetailProps { title: string; body: string; meta: string }
interface RsvpProps { heading: string; body: string; buttonText: string }
interface TravelProps { heading: string; body: string }
interface FaqProps { heading: string; items: { q: string; a: string }[] }
interface FooterProps { names: string; note: string }

export interface SiteBlocks {
  Hero: HeroProps
  Schedule: ScheduleProps
  EventDetail: EventDetailProps
  RsvpCta: RsvpProps
  Travel: TravelProps
  Faq: FaqProps
  SiteFooterBlock: FooterProps
}

const text = (label: string) => ({ type: 'text' as const, label })
const area = (label: string) => ({ type: 'textarea' as const, label })

// Locked block library — no freeform canvas (handoff §1, §10).
export const siteConfig: Config<SiteBlocks> = {
  components: {
    Hero: {
      label: 'Hero',
      fields: {
        kicker: text('Kicker'), title: text('Title'), subtitle: text('Subtitle'),
        dateText: text('Date'), location: text('Location'), imageUrl: text('Background image URL'),
      },
      defaultProps: { kicker: 'Together with our families', title: 'Aanya & Dev', subtitle: '', dateText: '19 September 2026', location: 'Manchester, UK', imageUrl: '' },
      render: (p) => <SiteHero {...p} />,
    },
    Schedule: {
      label: 'Schedule',
      fields: { heading: text('Heading') },
      defaultProps: { heading: 'The Celebrations' },
      render: ({ heading, puck }) => <SiteSchedule heading={heading} events={metaEvents(puck)} />,
    },
    EventDetail: {
      label: 'Event detail',
      fields: { title: text('Title'), meta: text('Date / venue'), body: area('Description') },
      defaultProps: { title: 'Sangeet', meta: '', body: '' },
      render: (p) => <SiteEventDetail {...p} />,
    },
    RsvpCta: {
      label: 'RSVP call-to-action',
      fields: { heading: text('Heading'), body: area('Body'), buttonText: text('Button') },
      defaultProps: { heading: 'Kindly RSVP', body: 'We can’t wait to celebrate with you.', buttonText: 'Open your invitation' },
      render: (p) => <SiteRsvpCta {...p} />,
    },
    Travel: {
      label: 'Travel & stay',
      fields: { heading: text('Heading'), body: area('Body') },
      defaultProps: { heading: 'Travel & Stay', body: '' },
      render: (p) => <SiteTravel {...p} />,
    },
    Faq: {
      label: 'FAQ',
      fields: {
        heading: text('Heading'),
        items: {
          type: 'array', label: 'Questions',
          arrayFields: { q: text('Question'), a: area('Answer') },
          getItemSummary: (i) => i.q || 'Question',
        },
      },
      defaultProps: { heading: 'Questions', items: [{ q: 'When should I arrive?', a: 'Doors open 30 minutes before each event.' }] },
      render: (p) => <SiteFaq {...p} />,
    },
    SiteFooterBlock: {
      label: 'Footer',
      fields: { names: text('Names'), note: text('Note') },
      defaultProps: { names: 'Aanya & Dev', note: 'Made with Occasio' },
      render: (p) => <SiteFooter {...p} />,
    },
  },
}

export type SiteData = Data<SiteBlocks>

// Starter document for a new site's home page.
export const starterDoc: SiteData = {
  root: { props: {} },
  content: [
    { type: 'Hero', props: { id: 'hero', kicker: 'Together with our families', title: 'Aanya & Dev', subtitle: '', dateText: '19 September 2026', location: 'Manchester, UK', imageUrl: '' } },
    { type: 'Schedule', props: { id: 'schedule', heading: 'The Celebrations' } },
    { type: 'RsvpCta', props: { id: 'rsvp', heading: 'Kindly RSVP', body: 'We can’t wait to celebrate with you.', buttonText: 'Open your invitation' } },
    { type: 'SiteFooterBlock', props: { id: 'footer', names: 'Aanya & Dev', note: 'Made with Occasio' } },
  ],
}
