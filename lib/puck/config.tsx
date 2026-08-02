import type { Config, Data } from '@puckeditor/core'
import { BRAND_NAME } from '@/lib/brand'
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
type FreeformBlockProps = FreeformProps
/** Tombstone for a block type that no longer exists — see normaliseDoc. */
interface RetiredBlockProps { originalType: string }

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
  FreeformBlock: FreeformBlockProps
  SiteFooterBlock: FooterProps
  RetiredBlock: RetiredBlockProps
}

// `inline: true` = editable by clicking the text ON the canvas (Sprint B).
// Keep it OFF for values used in logic or attributes (URLs, ISO dates,
// image alts/captions, phone numbers) — those stay in the side panel.
const text = (label: string, inline = false) => ({ type: 'text' as const, label, contentEditable: inline })
const area = (label: string, inline = false) => ({ type: 'textarea' as const, label, contentEditable: inline })

import { ImageFieldInput, imageUrlOf, type ImageValue } from './image-field'
import { Styled, styleField, DEFAULT_STYLE, type StyleOpts } from './styled'
import { FreeformSection, type FreeformProps } from '@/components/site/freeform'
import { FreeformEditor } from './freeform-editor'
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
          // C6: this was `i.name || 'Side'`. Since C1 stopped seeding the demo
          // couple's names, both rows arrive blank — so every summary read
          // "Side" and the two were indistinguishable without opening each.
          // Falling back to the side label means a couple with nothing filled
          // in still sees "The Groom" and "The Bride" and knows which to open.
          getItemSummary: (i) => i.name || i.side || 'Side',
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
    FreeformBlock: {
      label: 'Freeform canvas',
      fields: {
        ratio: {
          type: 'select' as const, label: 'Canvas shape (kept on every device)',
          options: [
            { label: 'Wide (16:9)', value: '16/9' },
            { label: 'Classic (4:3)', value: '4/3' },
            { label: 'Square', value: '1/1' },
            { label: 'Portrait (4:5)', value: '4/5' },
          ],
        },
        wash: {
          type: 'select' as const, label: 'Background wash',
          options: [
            { label: 'Paper', value: 'paper' },
            { label: 'Sunken', value: 'sunken' },
            { label: 'Accent blush', value: 'blush' },
            { label: 'Night', value: 'night' },
            { label: 'Transparent', value: 'none' },
          ],
        },
        items: {
          type: 'array' as const, label: 'Items — drag them on the canvas',
          getItemSummary: (it: { kind?: string; text?: string }) =>
            it.kind === 'image' ? 'Photo' : (it.text || 'Text').slice(0, 24),
          arrayFields: {
            kind: {
              type: 'select' as const, label: 'Type',
              options: [{ label: 'Text', value: 'text' }, { label: 'Photo', value: 'image' }],
            },
            text: { type: 'textarea' as const, label: 'Text (double-click on canvas to edit too)' },
            url: {
              type: 'custom' as const, label: 'Photo',
              render: ({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) => (
                <ImageFieldInput value={value ?? ''} onChange={(v) => onChange(imageUrlOf(v))} />
              ),
            },
            size: { type: 'number' as const, label: 'Text size (relative)', min: 1, max: 20 },
            font: {
              type: 'select' as const, label: 'Font',
              options: [
                { label: 'Display', value: 'display' },
                { label: 'Body', value: 'sans' },
                { label: 'Script', value: 'script' },
              ],
            },
            color: {
              type: 'select' as const, label: 'Colour',
              options: [
                { label: 'Ink', value: 'ink' },
                { label: 'Soft ink', value: 'soft' },
                { label: 'Accent', value: 'accent' },
                { label: 'Paper', value: 'paper' },
              ],
            },
            align: {
              type: 'select' as const, label: 'Align',
              options: [
                { label: 'Centre', value: 'center' },
                { label: 'Left', value: 'left' },
                { label: 'Right', value: 'right' },
              ],
            },
            rotate: { type: 'number' as const, label: 'Rotate (°)', min: -45, max: 45 },
            // Precision fallbacks — dragging on the canvas is the main path.
            x: { type: 'number' as const, label: 'Left (%)', min: 0, max: 100 },
            y: { type: 'number' as const, label: 'Top (%)', min: 0, max: 100 },
            w: { type: 'number' as const, label: 'Width (%)', min: 4, max: 100 },
          },
          defaultItemProps: {
            kind: 'text', text: 'Your words here', url: '',
            x: 30, y: 40, w: 40, size: 5, font: 'display', color: 'ink', align: 'center', rotate: 0,
          },
        },
      },
      defaultProps: {
        ratio: '16/9', wash: 'sunken',
        items: [
          { kind: 'text', text: 'Aanya & Dev', x: 25, y: 30, w: 50, size: 9, font: 'display', color: 'ink', align: 'center', rotate: 0 },
          { kind: 'text', text: 'are getting married', x: 30, y: 58, w: 40, size: 3, font: 'script', color: 'accent', align: 'center', rotate: 0 },
        ],
      },
      render: (p) => {
        const editing = (p.puck as { isEditing?: boolean } | undefined)?.isEditing
        const props = { ratio: p.ratio, wash: p.wash, items: p.items }
        return editing
          ? <FreeformEditor id={String(p.id ?? '')} {...props} />
          : <FreeformSection {...props} />
      },
    },
    SiteFooterBlock: {
      label: 'Footer',
      fields: { names: text('Names', true), note: text('Note', true) },
      defaultProps: { names: 'Aanya & Dev', note: `Made with ${BRAND_NAME}` },
      render: (p) => <SiteFooter {...p} />,
    },
    // Tombstone. Never inserted by a host — normaliseDoc() swaps it in for any
    // block whose type is no longer in this config. Guests get nothing (the
    // content is genuinely gone and cannot be conjured back); the HOST gets a
    // visible, deletable marker so the gap is discoverable rather than silent.
    RetiredBlock: {
      label: 'Retired section',
      // Puck requires a field per prop. Shown but not useful to edit — it is a
      // record of what used to be here.
      fields: { originalType: text('Original block type') },
      defaultProps: { originalType: 'unknown' },
      render: (p) => {
        const editing = (p.puck as { isEditing?: boolean } | undefined)?.isEditing
        // Guests get an empty fragment, not null: Puck types render as Element.
        if (!editing) return <></>
        return <RetiredNotice originalType={String(p.originalType ?? 'unknown')} />
      },
    },
  },
}

/** Host-only marker for a block whose type this build no longer knows. */
function RetiredNotice({ originalType }: { originalType: string }) {
  return (
    <div style={{
      margin: '12px auto', maxWidth: 640, padding: '14px 16px',
      border: '1px dashed var(--line-2)', borderRadius: 12,
      background: 'var(--paper-2)', color: 'var(--ink-2)',
      fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.5, textAlign: 'center',
    }}>
      <strong style={{ color: 'var(--ink)' }}>This section is no longer available</strong>
      <div style={{ marginTop: 4 }}>
        It used to be a <code style={{ fontFamily: 'var(--font-mono)' }}>{originalType}</code> block.
        Your guests see nothing here — delete it, or add a new section in its place.
      </div>
    </div>
  )
}

// ── Sprint A injection: EVERY block gains the Style group (5 variants +
// accent/corners/shading/glow/hover/appear) via one generic wrapper. Values
// live in the page doc → frozen into snapshots like all content. In the
// EDITOR only, each block is additionally wrapped in EditorBlockChrome
// (hover name chip + "Add below" insert menu) — the public render never
// sees it. ─────────────────────────────────────────────────────────────
import { EditorBlockChrome } from './block-chrome'

for (const key of Object.keys(siteConfig.components)) {
  const comp = siteConfig.components[key as keyof SiteBlocks] as unknown as {
    label?: string
    fields: Record<string, unknown>
    defaultProps: Record<string, unknown>
    render: (p: Record<string, unknown>) => React.ReactNode
  }
  comp.fields.styleOpts = styleField
  comp.defaultProps = { ...comp.defaultProps, styleOpts: { ...DEFAULT_STYLE } }
  const orig = comp.render
  const label = comp.label ?? key
  comp.render = (p) => {
    const inner = <Styled opts={p.styleOpts as StyleOpts | undefined}>{orig(p)}</Styled>
    const editing = (p.puck as { isEditing?: boolean } | undefined)?.isEditing
    if (!editing) return inner
    return (
      <EditorBlockChrome id={String(p.id ?? '')} label={label}>
        {inner}
      </EditorBlockChrome>
    )
  }
}

export type SiteData = Data<SiteBlocks>

/** A valid but empty document — what a blank page should render as. */
export const EMPTY_DOC: SiteData = { root: { props: {} }, content: [] }

/**
 * Is this stored `puck_data` something Render can actually take?
 *
 * Pages are created with `puck_data` defaulting to `'{}'` (see the schema and
 * scripts/seed-demo.mjs), and Puck's Render THROWS on a document with no
 * content array — it does not degrade to blank. A `?? starterDoc` null-check
 * does not catch `{}`, because `{}` is not nullish. Publishing a freshly seeded
 * site before touching the editor therefore served guests an error page.
 *
 * Every consumer must normalise through this, not null-check.
 */
export function isRenderableDoc(doc: unknown): doc is SiteData {
  const d = doc as SiteData | null
  return !!d && typeof d === 'object' && Array.isArray(d.content)
}

/**
 * Replace blocks this build cannot render with a tombstone.
 *
 * Published snapshots are IMMUTABLE and can be months old, so they outlive the
 * block library. Puck's Render silently drops content whose `type` is not in
 * the config: rename or retire a block and every site using it quietly loses
 * that section — the whole page, if it was the only one — with nobody told.
 * A malformed entry (a null in `content`) is worse still, and throws.
 *
 * Both become a RetiredBlock here: the rest of the page survives, the host sees
 * a deletable marker in the editor, and the original type name is preserved so
 * the loss is legible rather than mysterious.
 *
 * Note this is a real migration when it runs in the EDITOR — the host's next
 * save persists `RetiredBlock` in place of the dead type. That is intended: it
 * turns an invisible landmine into a visible, fixable one.
 */
export function normaliseDoc(doc: SiteData): { doc: SiteData; retired: string[] } {
  const known = new Set(Object.keys(siteConfig.components))
  const retired: string[] = []

  const content = doc.content.map((block, i) => {
    const type = (block as { type?: string } | null)?.type
    if (type && known.has(type)) return block
    retired.push(type ?? '(malformed entry)')
    // Reuse the original id where there is one so React keys stay stable.
    const id = (block as { props?: { id?: string } } | null)?.props?.id ?? `retired-${i}`
    return { type: 'RetiredBlock', props: { id, originalType: type ?? 'unknown' } }
  })

  return { doc: { ...doc, content: content as SiteData['content'] }, retired }
}

/**
 * The document to render for a page, matching what the editor shows for the
 * same row — the home page falls back to the template starter, other pages
 * render blank, and neither can throw.
 *
 * `label` only appears in the warning when something had to be tombstoned.
 */
export function docForPage(
  doc: unknown,
  isHome: boolean,
  starter: SiteData,
  label = 'page',
): SiteData {
  const base = isRenderableDoc(doc) && doc.content.length > 0 ? doc : isHome ? starter : EMPTY_DOC
  const { doc: safe, retired } = normaliseDoc(base)
  if (retired.length) {
    // Loud on the server so this reaches logs rather than only the host's eye.
    console.warn(
      `[site] ${label}: ${retired.length} block(s) no longer in siteConfig — ` +
      `rendered as tombstones: ${retired.join(', ')}`,
    )
  }
  return safe
}

// Starter document for a new site's home page.
export const starterDoc: SiteData = {
  root: { props: {} },
  content: [
    { type: 'Hero', props: { id: 'hero', kicker: 'Together with our families', title: 'Aanya & Dev', subtitle: '', dateText: '19 September 2026', location: 'Manchester, UK', imageUrl: '' } },
    { type: 'Schedule', props: { id: 'schedule', heading: 'The Celebrations' } },
    { type: 'RsvpCta', props: { id: 'rsvp', heading: 'Kindly RSVP', body: 'We can’t wait to celebrate with you.', buttonText: 'Open your invitation' } },
    { type: 'SiteFooterBlock', props: { id: 'footer', names: 'Aanya & Dev', note: `Made with ${BRAND_NAME}` } },
  ],
}
