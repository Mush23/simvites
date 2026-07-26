// ═══════════════════════════════════════════════════════════════════════
// Sprint A — per-BLOCK styling (the stakeholder ask).
// Every block gains: 5 variants (looks) + overrides for accent, corners,
// shadow, glow, hover and an appear animation. Implemented as ONE generic
// wrapper injected into every component in the Puck config, so the whole
// library gets it without touching each block. Values live in the page doc,
// so they freeze into publish snapshots like all content.
// ═══════════════════════════════════════════════════════════════════════

// Type-only link from registry → config makes this import cycle-safe at runtime.
import { TEMPLATES } from '@/lib/templates/registry'

export interface StyleOpts {
  variant?:
    | 'classic' | 'framed' | 'banded' | 'minimal' | 'grand'
    | 'gilded' | 'arch' | 'postcard' | 'editorial' | 'velvet'
  accent?: 'inherit' | 'gold' | 'terracotta' | 'oxblood' | 'sage' | 'ink'
  corners?: 'inherit' | 'sharp' | 'soft' | 'round'
  shadow?: 'inherit' | 'none' | 'soft' | 'deep'
  glow?: 'inherit' | 'none' | 'soft' | 'strong'
  hover?: 'inherit' | 'lift' | 'grow' | 'tilt' | 'none'
  anim?: 'none' | 'rise' | 'fade' | 'zoom' | 'slide'
  /** D4: borrow another template's palette for just this block. */
  skin?: string
}

export const DEFAULT_STYLE: StyleOpts = {
  variant: 'classic', accent: 'inherit', corners: 'inherit',
  shadow: 'inherit', glow: 'inherit', hover: 'inherit', anim: 'rise',
  skin: 'inherit',
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
  // D4: a block can wear ANOTHER template's whole identity (palette + display
  // face). Applied first so accent/corner overrides still win on top.
  if (o.skin && o.skin !== 'inherit') {
    const skin = TEMPLATES.find((t) => t.key === o.skin)
    if (skin) Object.assign(vars, skin.vars)
  }
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
  // Scope in the label: the dock's Style panel is sitewide, this is one block.
  // Neither used to say so, which is what made two entry points confusing.
  label: 'Style this section — look, colour & motion',
  objectFields: {
    variant: {
      type: 'select' as const, label: 'Look (10 options)',
      options: [
        { label: 'Timeless', value: 'classic' },
        { label: 'Keepsake Frame', value: 'framed' },
        { label: 'Silk Band', value: 'banded' },
        { label: 'Whisper', value: 'minimal' },
        { label: 'Royal Flourish', value: 'grand' },
        { label: 'Gilded Edge', value: 'gilded' },
        { label: 'Grand Arch', value: 'arch' },
        { label: 'Postcard', value: 'postcard' },
        { label: 'Editorial Rule', value: 'editorial' },
        { label: 'Velvet Night', value: 'velvet' },
      ],
    },
    skin: {
      type: 'select' as const, label: 'Borrow a template\'s palette',
      options: [
        { label: 'This site\'s template', value: 'inherit' },
        ...TEMPLATES.map((t) => ({ label: t.name, value: t.key })),
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
