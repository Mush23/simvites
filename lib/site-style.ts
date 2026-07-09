import { getTemplate, templateStyle, templateButtonRadius } from '@/lib/templates/registry'
import { DISPLAY_FACES, BODY_FACES } from '@/lib/template-fonts'

// ═══════════════════════════════════════════════════════════════════════
// Site Style engine — per-couple customisation on top of the template:
// font pairing, background, accent, card glow and hover animation, all
// stored in sites.theme and frozen into publish snapshots like everything
// else. Applied as CSS vars + data attributes at [data-site-root].
// ═══════════════════════════════════════════════════════════════════════

export const FONT_PAIRS = {
  classic: { label: 'Cormorant + Jost', display: 'var(--f-cormorant)', sans: 'var(--f-jost)' },
  gallery: { label: 'Fraunces + Inter', display: 'var(--f-fraunces)', sans: 'var(--f-inter)' },
  editorial: { label: 'Cormorant + Inter', display: 'var(--f-cormorant)', sans: 'var(--f-inter)' },
  warm: { label: 'Fraunces + Jost', display: 'var(--f-fraunces)', sans: 'var(--f-jost)' },
} as const

export const BACKGROUNDS = {
  template: { label: 'Template default', vars: {} },
  pearl: { label: 'Pearl', vars: { '--paper': '#FBF8F3', '--paper-2': '#F3EDE2', '--surface': '#FFFFFF', '--surface-2': '#F3EDE2' } },
  ivory: { label: 'Ivory', vars: { '--paper': '#F6F1E9', '--paper-2': '#EFE8DC', '--surface': '#FBF8F3', '--surface-2': '#EFE8DC' } },
  blush: { label: 'Blush mist', vars: { '--paper': '#F9F0ED', '--paper-2': '#F3E4E1', '--surface': '#FDF8F6', '--surface-2': '#F3E4E1' } },
  sage: { label: 'Sage mist', vars: { '--paper': '#F1F4EC', '--paper-2': '#E6EBDE', '--surface': '#F9FBF6', '--surface-2': '#E6EBDE' } },
  night: { label: 'Midnight', vars: { '--paper': '#1E1B16', '--paper-2': '#181512', '--surface': '#26221C', '--surface-2': '#2B2721', '--ink': '#F2EDE4', '--ink-2': '#C7BEB0', '--ink-3': '#948B7C', '--line': '#37322A', '--line-2': '#4A4237' } },
} as const

export const ACCENTS = {
  template: { label: 'Template default', vars: {} },
  gold: { label: 'Gold', vars: { '--accent': 'oklch(0.62 0.12 78)', '--accent-ink': 'oklch(0.53 0.105 70)', '--accent-line': 'oklch(0.72 0.11 75)', '--accent-soft': 'oklch(0.95 0.03 80)' } },
  terracotta: { label: 'Terracotta', vars: { '--accent': '#B4552D', '--accent-ink': '#A04A26', '--accent-line': '#CFA093', '--accent-soft': '#F6E7DF' } },
  oxblood: { label: 'Oxblood', vars: { '--accent': '#7E3232', '--accent-ink': '#6E2B2B', '--accent-line': '#C99C93', '--accent-soft': '#F3E4E1' } },
  sageDeep: { label: 'Sage', vars: { '--accent': '#6E7A63', '--accent-ink': '#5C6852', '--accent-line': '#A9B29E', '--accent-soft': '#E9EDE2' } },
  ink: { label: 'Ink', vars: { '--accent': '#211D18', '--accent-ink': '#3A342C', '--accent-line': '#C4BAAA', '--accent-soft': '#EFE8DC' } },
} as const

export const GLOWS = { none: 'None', soft: 'Soft', strong: 'Strong' } as const
export const HOVERS = { lift: 'Lift', grow: 'Grow', tilt: 'Tilt', none: 'Still' } as const

/** Button designs (D3). Shape styles set radius; treatment styles restyle fills. */
export const BUTTONS = {
  template: 'Template default',
  pill: 'Pill',
  soft: 'Rounded',
  square: 'Sharp',
  outline: 'Outline',
  ghost: 'Soft fill',
  underline: 'Underline',
} as const

/** Menu / navbar designs (D6), rendered by SiteNav. */
export const NAVS = {
  glass: 'Glass bar',
  banner: 'Solid banner',
  centered: 'Centered monogram',
  minimal: 'Minimal line',
} as const

/** Full-page backdrop effects (Framer-parity ask): pure CSS, template-tinted. */
export const BACKDROPS = {
  none: 'None',
  mesh: 'Soft mesh',
  aurora: 'Aurora drift',
  petals: 'Floating petals',
  shimmer: 'Silk shimmer',
} as const

export interface SiteStyle {
  template?: string
  fontPair?: keyof typeof FONT_PAIRS
  background?: keyof typeof BACKGROUNDS
  accent?: keyof typeof ACCENTS
  glow?: keyof typeof GLOWS
  hover?: keyof typeof HOVERS
  backdrop?: keyof typeof BACKDROPS
  /** Brand Kit (Sprint D): uploaded monogram image + fallback initials ("A & D"). */
  monogram?: string
  initials?: string
  // ── D3: free typography + custom colours + button + nav designs ──
  /** Any display face from the pool — supersedes fontPair's display half. */
  displayFont?: keyof typeof DISPLAY_FACES
  /** Any body face from the pool — supersedes fontPair's sans half. */
  bodyFont?: keyof typeof BODY_FACES
  /** Colour-picker hexes; each supersedes its preset when set. */
  customAccent?: string
  customPaper?: string
  customInk?: string
  buttonStyle?: keyof typeof BUTTONS
  nav?: keyof typeof NAVS
}

const HEX = /^#[0-9a-fA-F]{6}$/

/** The chosen backdrop effect for a site theme ('none' hides the layer). */
export function backdropOf(theme: unknown): keyof typeof BACKDROPS {
  const b = (theme as SiteStyle | null | undefined)?.backdrop
  return b && b in BACKDROPS ? b : 'none'
}

/** Merge template vars + couple's overrides → wrapper props for the site root. */
export function siteStyleProps(theme: unknown) {
  const t = (theme ?? {}) as SiteStyle
  const template = getTemplate(t.template)
  const style = templateStyle(t.template)
  const vars: Record<string, string> = { ...template.vars }
  const bg = BACKGROUNDS[t.background ?? 'template']
  Object.assign(vars, bg.vars)
  Object.assign(vars, ACCENTS[t.accent ?? 'template'].vars)
  if (t.fontPair && FONT_PAIRS[t.fontPair]) {
    const fp = FONT_PAIRS[t.fontPair]
    vars['--font-display'] = `${fp.display}, Georgia, serif`
    vars['--font-sans'] = `${fp.sans}, system-ui, sans-serif`
    vars['--font-instrument'] = fp.display
    vars['--font-hanken'] = fp.sans
  }

  // D3: free typography — any display × any body face, over pair presets.
  if (t.displayFont && DISPLAY_FACES[t.displayFont]) {
    const f = DISPLAY_FACES[t.displayFont].css
    vars['--font-display'] = `${f}, Georgia, serif`
    vars['--font-instrument'] = f
  }
  if (t.bodyFont && BODY_FACES[t.bodyFont]) {
    const f = BODY_FACES[t.bodyFont].css
    vars['--font-sans'] = `${f}, system-ui, sans-serif`
    vars['--font-hanken'] = f
  }

  // D3: colour pickers — a single hex fans out into the token family via
  // color-mix, so one choice restyles surfaces, lines and soft washes together.
  if (t.customPaper && HEX.test(t.customPaper)) {
    const p = t.customPaper
    vars['--paper'] = p
    vars['--paper-2'] = `color-mix(in oklab, ${p} 93%, black 7%)`
    vars['--surface'] = `color-mix(in oklab, ${p} 91%, white 9%)`
    vars['--surface-2'] = `color-mix(in oklab, ${p} 88%, black 12%)`
  }
  if (t.customInk && HEX.test(t.customInk)) {
    const i = t.customInk
    vars['--ink'] = i
    vars['--ink-2'] = `color-mix(in oklab, ${i} 76%, var(--paper))`
    vars['--ink-3'] = `color-mix(in oklab, ${i} 56%, var(--paper))`
    vars['--line'] = `color-mix(in oklab, ${i} 14%, var(--paper))`
    vars['--line-2'] = `color-mix(in oklab, ${i} 22%, var(--paper))`
  }
  if (t.customAccent && HEX.test(t.customAccent)) {
    const a = t.customAccent
    vars['--accent'] = a
    vars['--accent-ink'] = `color-mix(in oklab, ${a} 82%, var(--ink))`
    vars['--accent-line'] = `color-mix(in oklab, ${a} 45%, var(--paper))`
    vars['--accent-soft'] = `color-mix(in oklab, ${a} 12%, var(--paper))`
  }

  // Structural style tokens (not just colour): the block CSS reads these.
  vars['--tpl-btn-radius'] = templateButtonRadius(t.template)
  const btn = t.buttonStyle ?? 'template'
  if (btn === 'pill') vars['--tpl-btn-radius'] = '999px'
  else if (btn === 'soft') vars['--tpl-btn-radius'] = '12px'
  else if (btn === 'square') vars['--tpl-btn-radius'] = '3px'

  return {
    style: vars as React.CSSProperties,
    'data-glow': t.glow ?? 'none',
    'data-hover': t.hover ?? 'lift',
    'data-heading-case': style.headingCase,
    // Treatment button styles restyle fills via CSS (globals).
    ...(btn === 'outline' || btn === 'ghost' || btn === 'underline' ? { 'data-button': btn } : {}),
  }
}
