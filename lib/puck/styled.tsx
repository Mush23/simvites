// ═══════════════════════════════════════════════════════════════════════
// Sprint A — per-BLOCK styling (the stakeholder ask).
// Every block gains: 5 variants (looks) + overrides for accent, corners,
// shadow, glow, hover and an appear animation. Implemented as ONE generic
// wrapper injected into every component in the Puck config, so the whole
// library gets it without touching each block. Values live in the page doc,
// so they freeze into publish snapshots like all content.
// ═══════════════════════════════════════════════════════════════════════

export interface StyleOpts {
  variant?: 'classic' | 'framed' | 'banded' | 'minimal' | 'grand'
  accent?: 'inherit' | 'gold' | 'terracotta' | 'oxblood' | 'sage' | 'ink'
  corners?: 'inherit' | 'sharp' | 'soft' | 'round'
  shadow?: 'inherit' | 'none' | 'soft' | 'deep'
  glow?: 'inherit' | 'none' | 'soft' | 'strong'
  hover?: 'inherit' | 'lift' | 'grow' | 'tilt' | 'none'
  anim?: 'none' | 'rise' | 'fade' | 'zoom' | 'slide'
}

export const DEFAULT_STYLE: StyleOpts = {
  variant: 'classic', accent: 'inherit', corners: 'inherit',
  shadow: 'inherit', glow: 'inherit', hover: 'inherit', anim: 'rise',
}

const ACCENT_VARS: Record<string, Record<string, string>> = {
  gold: { '--accent': 'oklch(0.62 0.12 78)', '--accent-ink': 'oklch(0.53 0.105 70)', '--accent-line': 'oklch(0.72 0.11 75)', '--accent-soft': 'oklch(0.95 0.03 80)' },
  terracotta: { '--accent': '#B4552D', '--accent-ink': '#A04A26', '--accent-line': '#CFA093', '--accent-soft': '#F6E7DF' },
  oxblood: { '--accent': '#7E3232', '--accent-ink': '#6E2B2B', '--accent-line': '#C99C93', '--accent-soft': '#F3E4E1' },
  sage: { '--accent': '#6E7A63', '--accent-ink': '#5C6852', '--accent-line': '#A9B29E', '--accent-soft': '#E9EDE2' },
  ink: { '--accent': '#211D18', '--accent-ink': '#3A342C', '--accent-line': '#C4BAAA', '--accent-soft': '#EFE8DC' },
}
const CORNER_VARS: Record<string, string> = { sharp: '4px', soft: '13px', round: '24px' }

/** Wrapper applied around every block's output. Server-safe (plain div). */
export function Styled({ opts, children }: { opts?: StyleOpts; children: React.ReactNode }) {
  const o = { ...DEFAULT_STYLE, ...(opts ?? {}) }
  const vars: Record<string, string> = {}
  if (o.accent && o.accent !== 'inherit') Object.assign(vars, ACCENT_VARS[o.accent] ?? {})
  if (o.corners && o.corners !== 'inherit') vars['--radius-card'] = CORNER_VARS[o.corners]

  return (
    <div
      data-block
      data-variant={o.variant ?? 'classic'}
      data-banim={o.anim ?? 'rise'}
      {...(o.glow && o.glow !== 'inherit' ? { 'data-glow': o.glow } : {})}
      {...(o.hover && o.hover !== 'inherit' ? { 'data-hover': o.hover } : {})}
      {...(o.shadow && o.shadow !== 'inherit' ? { 'data-shadow': o.shadow } : {})}
      style={vars as React.CSSProperties}
    >
      {children}
    </div>
  )
}

/** The Puck field group added to every block's side panel. */
export const styleField = {
  type: 'object' as const,
  label: 'Style — look, colour & motion',
  objectFields: {
    variant: {
      type: 'select' as const, label: 'Look (5 options)',
      options: [
        { label: 'Classic', value: 'classic' },
        { label: 'Framed', value: 'framed' },
        { label: 'Banded', value: 'banded' },
        { label: 'Minimal', value: 'minimal' },
        { label: 'Grand', value: 'grand' },
      ],
    },
    accent: {
      type: 'select' as const, label: 'Accent colour',
      options: [
        { label: 'Site accent', value: 'inherit' },
        { label: 'Gold', value: 'gold' },
        { label: 'Terracotta', value: 'terracotta' },
        { label: 'Oxblood', value: 'oxblood' },
        { label: 'Sage', value: 'sage' },
        { label: 'Ink', value: 'ink' },
      ],
    },
    corners: {
      type: 'select' as const, label: 'Corners',
      options: [
        { label: 'Site default', value: 'inherit' },
        { label: 'Sharp', value: 'sharp' },
        { label: 'Soft', value: 'soft' },
        { label: 'Round', value: 'round' },
      ],
    },
    shadow: {
      type: 'select' as const, label: 'Shading',
      options: [
        { label: 'Site default', value: 'inherit' },
        { label: 'None', value: 'none' },
        { label: 'Soft', value: 'soft' },
        { label: 'Deep', value: 'deep' },
      ],
    },
    glow: {
      type: 'select' as const, label: 'Glow',
      options: [
        { label: 'Site default', value: 'inherit' },
        { label: 'None', value: 'none' },
        { label: 'Soft glow', value: 'soft' },
        { label: 'Strong glow', value: 'strong' },
      ],
    },
    hover: {
      type: 'select' as const, label: 'Hover animation',
      options: [
        { label: 'Site default', value: 'inherit' },
        { label: 'Lift', value: 'lift' },
        { label: 'Grow', value: 'grow' },
        { label: 'Tilt', value: 'tilt' },
        { label: 'Still', value: 'none' },
      ],
    },
    anim: {
      type: 'select' as const, label: 'Appear animation',
      options: [
        { label: 'Rise in', value: 'rise' },
        { label: 'Fade in', value: 'fade' },
        { label: 'Zoom in', value: 'zoom' },
        { label: 'Slide in', value: 'slide' },
        { label: 'None', value: 'none' },
      ],
    },
  },
}
