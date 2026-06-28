---
# DESIGN.md — Occasio design language
# Hand this to Claude Code alongside the build handoff. Its job: make the product
# feel made-by-a-person and premium — never "generic AI beige".
# Format follows the getdesign.md / Google Stitch DESIGN.md convention.

meta:
  brand: Occasio            # placeholder — keep as BRAND_NAME constant
  vibe: [editorial, warm, calm, premium, celebratory, quietly-confident]
  not: [corporate-saas-blue, neon-gradient, glassmorphism-everywhere, emoji-ui, generic-bootstrap]
  inspiration: [fine wedding stationery, Aesop, Kinfolk, the couple's own admin dashboard]

color:
  # OKLCH. Two themes. Warm paper, ink text, ONE confident accent. No second accent.
  light:
    paper:      "oklch(0.992 0.004 85)"   # warm ivory page
    paper-2:    "oklch(0.972 0.005 80)"   # sunk panels
    surface:    "oklch(1 0 0)"            # cards
    ink:        "oklch(0.23 0.014 55)"    # primary text (warm near-black)
    ink-2:      "oklch(0.44 0.013 55)"
    ink-3:      "oklch(0.60 0.010 55)"
    line:       "oklch(0.915 0.006 70)"
    accent:     "oklch(0.56 0.155 33)"    # terracotta — the single brand colour
    accent-ink: "oklch(0.47 0.15 33)"     # accent text on paper (AA-safe)
  dark:
    paper:      "oklch(0.175 0.009 60)"   # warm charcoal, NOT pure black/blue-grey
    surface:    "oklch(0.215 0.011 60)"
    ink:        "oklch(0.95 0.006 85)"
    accent:     "oklch(0.74 0.145 42)"    # accent lifts in dark for contrast
  semantic:     # derive from hue, keep muted — never candy-bright
    ok: "155 hue"  warn: "70 hue"  bad: "27 hue"  info: "250 hue"
  rule: >
    The accent is configurable per site (couples pick from a curated 4-5 swatch set,
    never a free colour wheel). Everything else is fixed. One accent at a time.

type:
  families:
    display: "Instrument Serif"     # headlines, numbers, names — the soul of the brand
    display-alt: "Libre Caslon Display"
    sans: "Hanken Grotesk"          # body, UI, labels
    mono: "JetBrains Mono"          # micro-labels, dates, codes, eyebrows (UPPERCASE, letter-spaced)
  scale: [11, 12.5, 14, 16, 19, 23, 30, 38, 50, 64, 90]   # px, generous jumps
  rules:
    - "Headlines & all numerals in the serif. Big, confident, tight leading (~0.98-1.1)."
    - "Eyebrows/labels: JetBrains Mono, 9-11px, UPPERCASE, letter-spacing .12-.24em, ink-3 or accent-ink."
    - "Body: Hanken Grotesk 14-16px, line-height 1.6-1.7. Never below 12px in UI, 24px on slides."
    - "Use old-style/lining serif numerals for stats (see the couple's admin dashboard — that's the target)."

space:
  base: 4
  scale: [4, 6, 8, 12, 16, 22, 30, 40, 54, 64]
  rule: "Whitespace is the luxury signal. When unsure, add more. Cards breathe (18-26px padding)."

radius: { sm: 6, md: 9, card: 13, lg: 16, pill: 999 }    # soft, not pill-everything

shadow:
  card: "0 1px 2px rgba(40,22,10,.05), 0 10px 34px -12px rgba(40,22,10,.10)"
  lift: "0 40px 80px -28px rgba(40,22,10,.22)"
  rule: "Shadows are warm-tinted (brown, not grey/blue) and soft. Used on hover-lift and modals only."

motion:
  duration: { fast: 150, base: 280, slow: 500 }
  ease: "cubic-bezier(.22,1,.36,1)"
  rules:
    - "Entrances animate TRANSFORM, never opacity-to-0 as a resting state (content must never get stuck invisible)."
    - "Hover: cards lift 1-3px + deepen shadow. Buttons nudge up 1px with an accent glow."
    - "Respect prefers-reduced-motion. Motion is seasoning, not the meal."
---

# Occasio — design language

**One line:** warm editorial stationery, rendered as a calm, premium software product. If a screen could pass as a page from a beautiful wedding magazine *and* as a confident SaaS dashboard, it's right.

## The anti-AI rules (read these first)
The brief is explicitly "don't feel AI-generated." Concretely, that means **avoid** every default a generic model reaches for:
- ❌ Indigo/violet SaaS gradients, glassmorphism, neon, drop-shadow glows.
- ❌ Inter/Roboto/Arial everywhere. ❌ emoji as UI icons. ❌ rounded-pill everything.
- ❌ Centered hero + three feature cards + "Trusted by" logo wall.
- ❌ Cold pure-grey or blue-grey neutrals; pure-black dark mode.
- ✅ Instead: warm ivory paper, a serif with real personality, one terracotta accent, generous whitespace, mono micro-labels, old-style numerals, restraint.

## Voice
Warm, certain, human. Short sentences. Talks to a couple, not a "user." Never corporate ("leverage," "seamless solution"), never cutesy. Example microcopy: *"You're on track. 3 things need a quick look."* / *"Made with Occasio."*

## Layout
- 12-col fluid; content max-widths ~980-1060px; the public site can go full-bleed for imagery.
- Flex/grid with `gap` — never margin-hacked inline flow.
- Cards on `surface` over `paper-2`, 1px `line` border, `radius.card`, warm shadow on hover.
- Dashboards answer "what needs attention?" first — a single readiness number, then supporting stats, then detail.

## Components — the house style
- **Buttons:** solid accent (primary) / `surface`+`line` (secondary) / text (tertiary). 9px radius, 600-700 weight, 1px hover lift.
- **Stat card:** mono uppercase label, huge serif numeral, optional thin progress bar. (This is the couple's dashboard DNA — keep it.)
- **Eyebrow + serif headline + body** is the canonical section header rhythm.
- **Inputs:** `paper-2` fill, 1px `line`, 10px radius, generous 11-13px padding, real focus ring in accent.
- **Status:** muted soft-bg pills (`*-soft` token bg + `*` token text), never saturated.

## Editing experience (the product's soul)
Couples edit **on the page, like PowerPoint**: click any text and type, hover an image to replace/crop, a floating toolbar for font/size/colour, drag sections to reorder. The editor chrome uses this same design language so the canvas always previews truthfully. Effortless editing *is* the moat — protect it. (See `Occasio Editor.dc.html` for the working reference.)

## Cultural stance
Neutral-luxe by default; cultural richness is opt-in (presets a host applies and then edits). Never assume a religion. Never use religious symbols as decoration. Elegance over motif-spam. Every label is renamable (couple/guest/event/RSVP) because the schema is generic and the UI speaks the host's words.

## Accessibility (non-negotiable)
AA contrast minimum; the `*-ink` accent variants exist for text-on-paper. Tap targets ≥44px. Real visible focus states. Readable by an 80-year-old guest on a phone in low light — that's the bar for the public RSVP flow.

## Reference files
- `Occasio Prototype.dc.html` — the 5 command-centre hero screens (dashboard, event hub, guest matrix, vendor+budget, public site).
- `Occasio Editor.dc.html` — the inline click-to-edit website builder.
- `Occasio Blueprint.dc.html` — full strategy, IA, data model, build plan.
- `Occasio — Claude Code Handoff.md` — schema, RLS, routes, phases.
