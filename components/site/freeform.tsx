// Freeform section (D5) — the "place anything anywhere" canvas, done the
// responsive way: the section keeps a fixed aspect ratio and every item
// stores x/y/width as PERCENTAGES with text sized in container-query units
// (cqw). The composition therefore scales like a photograph — identical
// shape on a phone, a tablet and a cinema display. No media-query drift,
// nothing to "fix for mobile".

export interface FreeItem {
  kind: 'text' | 'image'
  text?: string
  url?: string
  x: number // % from left
  y: number // % from top
  w: number // % width
  size?: number // text size in cqw (container-relative)
  font?: 'display' | 'sans' | 'script'
  color?: 'ink' | 'soft' | 'accent' | 'paper'
  align?: 'left' | 'center' | 'right'
  rotate?: number // degrees
}

export interface FreeformProps {
  ratio: '16/9' | '4/3' | '1/1' | '4/5'
  wash: 'paper' | 'sunken' | 'blush' | 'night' | 'none'
  items: FreeItem[]
}

export const FONT_CSS: Record<NonNullable<FreeItem['font']>, string> = {
  display: 'var(--font-display)',
  sans: 'var(--font-sans)',
  script: 'var(--f-greatvibes), cursive',
}
export const COLOR_CSS: Record<NonNullable<FreeItem['color']>, string> = {
  ink: 'var(--ink)',
  soft: 'var(--ink-2)',
  accent: 'var(--accent-ink)',
  paper: 'var(--paper)',
}
export const WASH_CSS: Record<FreeformProps['wash'], string> = {
  paper: 'var(--paper)',
  sunken: 'var(--paper-2)',
  blush: 'var(--accent-soft)',
  night: 'var(--ink)',
  none: 'transparent',
}

/** One positioned item — shared markup between public render and editor. */
export function FreeItemView({ item }: { item: FreeItem }) {
  if (item.kind === 'image' && item.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.url} alt="" draggable={false}
        className="h-auto w-full select-none rounded-[max(0.6cqw,4px)] object-cover" />
    )
  }
  return (
    <span
      className="block leading-[1.15]"
      style={{
        fontFamily: FONT_CSS[item.font ?? 'display'],
        color: COLOR_CSS[item.color ?? 'ink'],
        fontSize: `${item.size ?? 5}cqw`,
        textAlign: item.align ?? 'center',
      }}
    >
      {item.text ?? ''}
    </span>
  )
}

export function freeItemStyle(item: FreeItem): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${item.x}%`,
    top: `${item.y}%`,
    width: `${item.w}%`,
    transform: item.rotate ? `rotate(${item.rotate}deg)` : undefined,
  }
}

/** Public, server-safe renderer — pure absolute positioning, zero JS. */
export function FreeformSection({ ratio, wash, items }: FreeformProps) {
  return (
    <section className="relative w-full overflow-hidden"
      style={{ aspectRatio: ratio, containerType: 'inline-size', background: WASH_CSS[wash] ?? WASH_CSS.paper }}>
      {(items ?? []).map((item, i) => (
        <div key={i} style={freeItemStyle(item)}>
          <FreeItemView item={item} />
        </div>
      ))}
    </section>
  )
}
