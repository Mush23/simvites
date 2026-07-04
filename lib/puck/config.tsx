import type { Config, Data } from '@puckeditor/core'
import {
  SiteHero, SiteSchedule, SiteEventDetail, SiteRsvpCta, SiteTravel, SiteFaq, SiteFooter,
  SiteStory, SiteFamily, SiteHotelTravel, SiteGiftsNote,
  type SiteEvent,
} from '@/components/site/blocks'
import { Countdown } from '@/components/site/countdown'
import { Gallery } from '@/components/site/gallery'

export interface PuckSiteMeta {
  events: SiteEvent[]
  /** Household name from the guest-session cookie, for the hero greeting. */
  guestName?: string
}
function meta(puck: unknown): Partial<PuckSiteMeta> {
  return (puck as { metadata?: Partial<PuckSiteMeta> } | undefined)?.metadata ?? {}
}
function metaEvents(puck: unknown): SiteEvent[] {
  return meta(puck).events ?? []
}

interface HeroProps {
  kicker: string; title: string; subtitle: string; dateText: string; location: string
  imageUrl: ImageValue
  /** Optional: docs created before Sprint C lack it — renderer defaults to 'balanced'. */
  overlay?: 'none' | 'soft' | 'balanced' | 'deep'
}
interface ScheduleProps { heading: string }
interface EventDetailProps { title: string; body: string; meta: string }
interface RsvpProps { heading: string; body: string; buttonText: string }
interface TravelProps { heading: string; body: string }
interface FaqProps { heading: string; items: { q: string; a: string }[] }
interface FooterProps { names: string; note: string }
interface CountdownProps { heading: string; dateISO: string }
interface StoryProps { kicker: string; title: string; paragraphs: { text: string }[] }
interface FamilyProps { heading: string; sides: { side: string; name: string; parents: string }[] }
interface GalleryProps { heading: string; images: { url: string; caption: string }[] }
interface HotelProps { heading: string; hotelName: string; address: string; blockCode: string; phone: string; bookingUrl: string; notes: string }
interface GiftsProps { heading: string; body: string }

export interface SiteBlocks {
  Hero: HeroProps
  CountdownBlock: CountdownProps
  StoryBlock: StoryProps
  FamilyBlock: FamilyProps
  Schedule: ScheduleProps
  EventDetail: EventDetailProps
  GalleryBlock: GalleryProps
  HotelTravel: HotelProps
  RsvpCta: RsvpProps
  Travel: TravelProps
  Faq: FaqProps
  GiftsNote: GiftsProps
  SiteFooterBlock: FooterProps
}

// `inline: true` = editable by clicking the text ON the canvas (Sprint B).
// Keep it OFF for values used in logic or attributes (URLs, ISO dates,
// image alts/captions, phone numbers) — those stay in the side panel.
const text = (label: string, inline = false) => ({ type: 'text' as const, label, contentEditable: inline })
const area = (label: string, inline = false) => ({ type: 'textarea' as const, label, contentEditable: inline })

import { ImageFieldInput, type ImageValue } from './image-field'
import { Styled, styleField, DEFAULT_STYLE, type StyleOpts } from './styled'
// `focal: true` adds the click-to-set focus point (hero-style full-bleed images).
const image = (label: string, focal = false) => ({
  type: 'custom' as const,
  label,
  // `never` param keeps this helper usable for string fields (Gallery) and
  // ImageValue fields (Hero) alike; the component only emits what fits.
  render: ({ value, onChange }: { value: ImageValue; onChange: (v: never) => void }) => (
    <ImageFieldInput value={value ?? ''} onChange={onChange as (v: ImageValue) => void} focal={focal} />
  ),
})

// Locked block library — no freeform canvas (handoff §1, §10).
export const siteConfig: Config<SiteBlocks> = {
  components: {
    Hero: {
      label: 'Hero',
      fields: {
        kicker: text('Kicker', true), title: text('Title', true), subtitle: text('Subtitle', true),
        dateText: text('Date', true), location: text('Location', true),
        imageUrl: image('Background photo', true),
        overlay: {
          type: 'select' as const, label: 'Photo overlay (text readability)',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Soft', value: 'soft' },
            { label: 'Balanced', value: 'balanced' },
            { label: 'Deep', value: 'deep' },
          ],
        },
      },
      defaultProps: { kicker: 'Together with our families', title: 'Aanya & Dev', subtitle: '', dateText: '19 September 2026', location: 'Manchester, UK', imageUrl: '', overlay: 'balanced' },
      render: ({ puck, ...p }) => <SiteHero {...p} guestName={meta(puck).guestName} />,
    },
    CountdownBlock: {
      label: 'Countdown',
      fields: { heading: text('Heading', true), dateISO: text('Date/time (ISO, e.g. 2026-09-19T10:30)') },
      defaultProps: { heading: 'The celebrations begin in', dateISO: '' },
      // Client component: pass ONLY serialisable props (never Puck's `puck` object).
      render: ({ heading, dateISO }) => <Countdown heading={heading} dateISO={dateISO} />,
    },
    StoryBlock: {
      label: 'Story',
      fields: {
        kicker: text('Kicker', true), title: text('Title', true),
        paragraphs: {
          type: 'array', label: 'Paragraphs',
          arrayFields: { text: area('Text', true) },
          getItemSummary: (i) => i.text?.slice(0, 40) || 'Paragraph',
        },
      },
      defaultProps: { kicker: 'Our Story', title: 'How we got here', paragraphs: [{ text: '' }] },
      render: (p) => <SiteStory {...p} />,
    },
    FamilyBlock: {
      label: 'Families',
      fields: {
        heading: text('Heading', true),
        sides: {
          type: 'array', label: 'Sides',
          arrayFields: { side: text('Side label', true), name: text('Name', true), parents: text('Parents line', true) },
          getItemSummary: (i) => i.name || 'Side',
        },
      },
      defaultProps: {
        heading: 'With the blessings of',
        sides: [
          { side: 'The Groom', name: '', parents: '' },
          { side: 'The Bride', name: '', parents: '' },
        ],
      },
      render: (p) => <SiteFamily {...p} />,
    },
    GalleryBlock: {
      label: 'Gallery',
      fields: {
        heading: text('Heading', true),
        images: {
          type: 'array', label: 'Photos',
          arrayFields: { url: image('Photo'), caption: text('Caption') },
          getItemSummary: (i) => i.caption || i.url?.slice(-24) || 'Photo',
        },
      },
      defaultProps: { heading: 'Moments', images: [] },
      render: ({ heading, images }) => <Gallery heading={heading} images={images ?? []} />,
    },
    HotelTravel: {
      label: 'Hotel & travel',
      fields: {
        heading: text('Heading', true), hotelName: text('Hotel name'), address: text('Address'),
        blockCode: text('Room-block code'), phone: text('Phone'),
        bookingUrl: text('Booking URL'), notes: area('Notes', true),
      },
      defaultProps: { heading: 'Stay & Travel', hotelName: '', address: '', blockCode: '', phone: '', bookingUrl: '', notes: '' },
      render: (p) => <SiteHotelTravel {...p} />,
    },
    GiftsNote: {
      label: 'Gifts note',
      fields: { heading: text('Heading', true), body: area('Body', true) },
      defaultProps: { heading: 'Your presence is the present', body: '' },
      render: (p) => <SiteGiftsNote {...p} />,
    },
    Schedule: {
      label: 'Schedule',
      fields: { heading: text('Heading', true) },
      defaultProps: { heading: 'The Celebrations' },
      render: ({ heading, puck }) => <SiteSchedule heading={heading} events={metaEvents(puck)} />,
    },
    EventDetail: {
      label: 'Event detail',
      fields: { title: text('Title', true), meta: text('Date / venue', true), body: area('Description', true) },
      defaultProps: { title: 'Sangeet', meta: '', body: '' },
      render: (p) => <SiteEventDetail {...p} />,
    },
    RsvpCta: {
      label: 'RSVP call-to-action',
      fields: { heading: text('Heading', true), body: area('Body', true), buttonText: text('Button', true) },
      defaultProps: { heading: 'Kindly RSVP', body: 'We can’t wait to celebrate with you.', buttonText: 'Open your invitation' },
      render: (p) => <SiteRsvpCta {...p} />,
    },
    Travel: {
      label: 'Travel & stay',
      fields: { heading: text('Heading', true), body: area('Body', true) },
      defaultProps: { heading: 'Travel & Stay', body: '' },
      render: (p) => <SiteTravel {...p} />,
    },
    Faq: {
      label: 'FAQ',
      fields: {
        heading: text('Heading', true),
        items: {
          type: 'array', label: 'Questions',
          arrayFields: { q: text('Question', true), a: area('Answer', true) },
          getItemSummary: (i) => i.q || 'Question',
        },
      },
      defaultProps: { heading: 'Questions', items: [{ q: 'When should I arrive?', a: 'Doors open 30 minutes before each event.' }] },
      render: (p) => <SiteFaq {...p} />,
    },
    SiteFooterBlock: {
      label: 'Footer',
      fields: { names: text('Names', true), note: text('Note', true) },
      defaultProps: { names: 'Aanya & Dev', note: 'Made with Occasio' },
      render: (p) => <SiteFooter {...p} />,
    },
  },
}

// ── Sprint A injection: EVERY block gains the Style group (5 variants +
// accent/corners/shading/glow/hover/appear) via one generic wrapper. Values
// live in the page doc → frozen into snapshots like all content. ──────────
for (const key of Object.keys(siteConfig.components)) {
  const comp = siteConfig.components[key as keyof SiteBlocks] as unknown as {
    fields: Record<string, unknown>
    defaultProps: Record<string, unknown>
    render: (p: Record<string, unknown>) => React.ReactNode
  }
  comp.fields.styleOpts = styleField
  comp.defaultProps = { ...comp.defaultProps, styleOpts: { ...DEFAULT_STYLE } }
  const orig = comp.render
  comp.render = (p) => (
    <Styled opts={p.styleOpts as StyleOpts | undefined}>{orig(p)}</Styled>
  )
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
