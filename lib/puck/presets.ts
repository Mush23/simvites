import type { SiteBlocks } from './config'
import { DEFAULT_STYLE } from './styled'

// ═══════════════════════════════════════════════════════════════════════
// Sprint D — section presets: pre-designed, ready-to-insert sections.
// One click in the editor appends a block with hand-tuned content AND
// per-block styling (Sprint A options), so couples start from something
// beautiful instead of a blank field list.
// ═══════════════════════════════════════════════════════════════════════

export interface SectionPreset<K extends keyof SiteBlocks = keyof SiteBlocks> {
  key: string
  name: string
  desc: string
  type: K
  props: SiteBlocks[K]
}

const style = (over: Partial<typeof DEFAULT_STYLE>) => ({ ...DEFAULT_STYLE, ...over })

export const SECTION_PRESETS: SectionPreset[] = [
  {
    key: 'story-framed',
    name: 'Our story, framed',
    desc: 'A framed, warm retelling with a gentle rise',
    type: 'StoryBlock',
    props: {
      kicker: 'Our Story', title: 'How we got here',
      paragraphs: [
        { text: 'It started with a shared table and a stolen samosa. Neither of us remembers who laughed first.' },
        { text: 'A few years, two cities and a thousand chai runs later, we are throwing the party we always talked about.' },
      ],
      styleOpts: style({ variant: 'framed', accent: 'oxblood', anim: 'rise' }),
    } as SiteBlocks['StoryBlock'],
  },
  {
    key: 'countdown-band',
    name: 'Countdown band',
    desc: 'A full-width band that zooms in as guests scroll',
    type: 'CountdownBlock',
    props: {
      heading: 'The celebrations begin in', dateISO: '',
      styleOpts: style({ variant: 'banded', anim: 'zoom' }),
    } as SiteBlocks['CountdownBlock'],
  },
  {
    key: 'gallery-wall',
    name: 'Gallery wall',
    desc: 'A clean, chrome-free photo grid',
    type: 'GalleryBlock',
    props: {
      heading: 'Moments', images: [],
      styleOpts: style({ variant: 'minimal', anim: 'fade' }),
    } as SiteBlocks['GalleryBlock'],
  },
  {
    key: 'faq-classic',
    name: 'Questions, answered',
    desc: 'Starter FAQ with the three everyone asks',
    type: 'Faq',
    props: {
      heading: 'Questions',
      items: [
        { q: 'What should I wear?', a: 'Festive Indian or formal western wear — bright colours encouraged.' },
        { q: 'Can I bring the children?', a: 'We love your little ones. Your invitation shows exactly who is invited to each event.' },
        { q: 'When should I RSVP by?', a: 'Please reply by the date on your invitation so we can plan seating and food.' },
      ],
      styleOpts: style({ anim: 'rise' }),
    } as SiteBlocks['Faq'],
  },
  {
    key: 'hotel-card',
    name: 'Hotel card',
    desc: 'A framed stay-and-travel card with booking button',
    type: 'HotelTravel',
    props: {
      heading: 'Stay & Travel', hotelName: '', address: '', blockCode: '', phone: '', bookingUrl: '', notes: '',
      styleOpts: style({ variant: 'framed', corners: 'round', shadow: 'deep', hover: 'lift' }),
    } as SiteBlocks['HotelTravel'],
  },
  {
    key: 'gifts-grand',
    name: 'Gifts note, grand',
    desc: 'A generous, centred note between hairlines',
    type: 'GiftsNote',
    props: {
      heading: 'Your presence is the present',
      body: 'Truly — having you there is everything. If you wish to give, a small contribution to our first home would touch our hearts.',
      styleOpts: style({ variant: 'grand', anim: 'fade' }),
    } as SiteBlocks['GiftsNote'],
  },
]
