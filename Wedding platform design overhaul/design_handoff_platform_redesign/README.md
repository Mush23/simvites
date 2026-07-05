# Handoff: Simvites platform redesign (landing + full app)

## Overview
A complete UI/UX overhaul of Simvites, a multi-tenant wedding-platform SaaS (Next.js App Router + React 19, Tailwind v4, Supabase, Stripe). The redesign replaces the current warm-editorial "wedding blog" look with a 2026 tech-SaaS design language ("one family, two voices"): the **tool** is neutral, fast and precise; the **artifact** (the couple's wedding site, invitations, RSVP surfaces) keeps the romantic serif/ivory identity. Deliverables: a scroll-driven deep-zoom marketing landing with a seamless simulated screen-recording demo, and a redesigned 13-module app shell.

## About the design files
The `.dc.html` files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and behavior, **not production code to copy directly**. The task is to **recreate these designs inside the existing simvites codebase** (Next.js App Router, React 19, Tailwind v4 with OKLCH tokens in `app/globals.css`, class-based dark mode) using its established patterns. Open each `.dc.html` in a browser (keep `support.js` next to them) to inspect the live behavior.

- `Landing (Deep Zoom).dc.html` — THE new marketing landing. Replaces `app/page.tsx` + `app/tour/flow-player.tsx`.
- `App Redesign.dc.html` — the new app shell + all 13 modules. Replaces `app/(app)/layout.tsx`, `components/app/sidebar.tsx`, `components/app/ui.tsx` patterns, and restyles every `app/(app)/*` page. Includes light + dark, ⌘K palette, dialog + toast system.
- `UI-UX Audit.dc.html` — the findings doc; every change is motivated here with file citations.
- `Landing Directions.dc.html` — 4 explored directions (built = 2a "Signal" hero + 2b "Obsidian" dive hybrid).
- `Auth & Onboarding.dc.html` — sign in (3a), magic-link-sent state (3b) and onboarding (3c). Replaces `app/login/page.tsx` and `app/onboarding/`.
- `Wedding Templates.dc.html` — 10 NEW couple-facing site templates (4a–4j) joining Editorial Gold + Editorial Luxury (12 total).
- `Current UI (Audit Base).dc.html` — faithful recreation of the current UI, for before/after reference only.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, copy and interactions are final intent. Recreate pixel-perfectly using the codebase's existing stack. Sample data (Aanya & Dev, Shah/Patel households, £ amounts) is demo content — wire to real Supabase data.

## Design tokens

### Typography
| Role | Font | Usage |
|---|---|---|
| UI (everything in the tool) | **Instrument Sans** (Google Fonts, variable 400–700) | Body 13.5–14px/1.5; headings 600–650 weight, tracking −0.02 to −0.045em; marketing display up to 80px |
| Artifact / wedding-facing ONLY | **Instrument Serif** (keep, already in codebase) | Template previews, site name in app chrome, invitation/RSVP guest surfaces, italic wedding words in marketing |
| Data / technical | **Geist Mono** (Google Fonts) | Numbers, counts, URLs, timestamps, kbd hints, tiny group labels (uppercase, 9.5–11px, tracking 0.06–0.1em) |

Replace `next/font` loads: `Instrument_Serif` stays; swap `Hanken_Grotesk` → `Instrument_Sans`; swap `JetBrains_Mono` → `Geist_Mono` (`import { Geist_Mono } from 'next/font/google'`).

**Kill the current `eyebrow` utility** (10px uppercase mono) as a form-label/table-header/button pattern. Functional text minimum 12px sentence-case, weight 500–550. Mono uppercase micro-labels survive only as *group* labels (sidebar sections, column headers) at 9.5px+, never as actions.

### Color — light (default)
| Token | Value | Use |
|---|---|---|
| bg | `#FAFAF8` | app/page background |
| surface | `#FFFFFF` | cards, sidebar, header |
| surface-2 | `#F5F4F2` | inputs, hover fills, wells |
| ink | `#191918` | primary text |
| ink-2 | `#6A6864` | secondary text |
| ink-3 | `#8F8D88` | tertiary/meta |
| line | `#E8E7E4` | hairline borders |
| line-2 | `#DBDAD6` | hover borders |
| accent | `oklch(0.62 0.21 29)` (≈ #DE4726) | ONE electric coral: primary buttons, active states, matrix dots |
| accent-soft | `rgba(222,71,38,.08)` | selected rows, chips |
| ok / warn / bad | `#1B9E5F` / `#B87A1E` / `#D2402A` | with soft bgs `#E5F5EC` / `#FAF0DD` / `#FBEAE6` |
| info | `#3E63DD` | rare |

### Color — dark
bg `#101012` · surface `#17171A` · surface-2 `#1F1F23` · ink `#F2F2F0` · ink-2 `#B0AEA9` · ink-3 `#7C7A76` · line `#26262B` · line-2 `#303036` · accent `oklch(0.68 0.19 30)` · ok `#3DD68C` · warn `#F0B25A` · bad `#F26D56` · soft = same hue at 14–16% alpha. Keep the existing `.dark` class mechanism; replace the values in `app/globals.css`.

### Per-event identity colors (kept, used as dots/chips everywhere events appear)
Mehndi `#3E7C4F` · Sangeet `#6D3FA9` · Ceremony `#C9A227` · Reception `#7A1F1F`

### Geometry & elevation
- Radii: controls **8px**, cards **10–14px**, dialogs/pricing **14–22px**. **Delete the global pill-button CSS override** in `globals.css` (`button:not(...) { border-radius:999px }`) — pills survive only for filter chips/status badges.
- Borders: 1px hairlines everywhere; elevation via border + subtle shadow, not heavy blur.
- Shadows: cards `0 1px 2px rgba(15,15,20,.04)`; overlays `0 40px 90px -20px rgba(0,0,0,.45)`.
- Motion: 120–250ms, `cubic-bezier(.2,.9,.3,1.1)` for pop-ins; **remove** hover translateY/translateX jiggles and card tilt/grow options from app chrome. Respect `prefers-reduced-motion` (pattern already in globals.css — keep).
- Wedding templates keep their existing look (Editorial Gold `#F5EFE3/#C9A227/#7A1F1F`, Editorial Luxury `#F6F1E9/#211D18/#B08D57`) — the redesign does NOT touch the couple-facing template rendering.

## Screens / views

### 1 · Marketing landing (`Landing (Deep Zoom).dc.html`)
Five scenes, in order:
1. **Hero (light).** Fixed glass nav pill (top-center, `rgba(255,255,255,.72)` + `backdrop-filter: blur(14px)`, radius 13px, links 13px/550, coral CTA "Start free"). Faint 56px grid background masked radially. Badge pill → H1 "Every event. Every guest. One platform." (`clamp(48px,6.4vw,80px)`, 650, −0.045em) → sub → two CTAs (dark solid "Start building free" + outline "Watch the 60 second take"). Below: browser-framed editor mock, `rotateX(11deg)` perspective 1600px, width min(980px,92vw). "Scroll to dive in" hint.
2. **The dive (sticky, section height 560vh).** Sticky 100vh stage. As scroll progress p goes 0→0.14 the demo frame scales 0.6→1.0, un-tilts; a near-black overlay (`oklch(0.13 0.004 270)` + faint 80px grid + coral radial glow) fades in over p 0.03–0.17. Frame holds ~p 0.14–0.44 while the **demo** plays, then recedes (scale −0.34, blur 3px, fade) over p 0.44–0.56.
3. **Module tunnel (same sticky stage).** Four dark "window" cards (Guests matrix, RSVPs live, Invitations links, Planning) fly past camera: each has center at p = 0.585/0.675/0.765/0.855 (half-span 0.085); far → `scale 0.38, opacity 0`, center → `scale 1, opacity 1`, past → `scale ~2.9, fade`. Alternating side captions "DIMENSION 01…04" (34px/650 white). Cards: `oklch(0.22 0.006 270)` bg, 1px `rgba(255,255,255,.13)` border, radius 14px, coral glow shadow.
4. **Ivory portal → wedding dimension.** A 130vmax ivory circle scales 0→1 over p 0.90–0.995 with serif label "the part your guests see"; sticky releases into an ivory (`oklch(0.975 0.006 85)`) section: serif-italic headline, two template preview cards (Ken Burns placeholder area — use real template screenshots in production), per-event color chips.
5. **USP duo + pricing + footer (light).** Two proof cards (per-event invitations mini-matrix → phone mock; RSVP card → live totals). Pricing = near-black card, coral radial glow, 3 ✓ rows. Real 4-column footer.

**The demo (inside the dive frame)** — a 22s seamless loop, no step captions; implement as a scripted timeline (the prototype's `_applyDemo(t)` is the exact spec):
| t (s) | beat |
|---|---|
| 0–1.6 | cursor drifts to hero title (bezier arc, ease-in-out; 22px arrow SVG with drop shadow; click = coral ripple ping + cursor scale .82) |
| 1.55 | select hero block (coral 2px outline; inspector field highlights) |
| 1.9–5.4 | types "Aanya & Dev" char-by-char, blinking caret, canvas mirrors panel |
| 6.45 | clicks "Gallery" in block library → gallery block slides in (translateY 14px→0, fade) |
| 8.3–10.6 | grabs countdown block, drags it below gallery (lift: rotate 1.6°, scale 1.02, shadow; sibling shifts; settle) |
| 11.95 | clicks gold accent swatch → canvas hero recolors |
| 13.35–15.35 | phone preview: canvas narrows to 46%, restacks; back to desktop |
| 16.9–18.4 | Publish → "Publishing…" → green "Published ✓"; toast "Your site is live" slides up; URL pill flips to "· live ●" |
| 18.4–21 | cursor drifts off; 21–22 white veil crossfade, loop resets |
Scrubber below stage: coral "● LIVE DEMO", progress bar with chapter ticks at 24%/48%/70%, chapter label (Edit anything / Add & arrange / Style & preview / Publish), clock. Chrome bar: macOS dots, URL pill, Desktop/Phone toggle, Publish button.
**Perf notes (implemented in prototype, replicate):** single rAF loop; skip demo DOM writes when the frame is offscreen or faded (p ≥ 0.62); skip scroll math when `scrollY` unchanged; transform/opacity only; `will-change` on moving layers; static state fallback under reduced-motion.

### 2 · App shell (`App Redesign.dc.html`, every module)
- **Sidebar 230px**, surface bg, hairline right border. Logo row → **site switcher** (serif site name + status dot + mono draft/live). Grouped nav: OVERVIEW (Home) / WEBSITE (Site editor, Events) / GUESTS (Guest list, Invitations, RSVPs, Seating) / PLANNING (Budget, Vendors, Tasks, Files) / INSIGHTS (Reports). Group labels: Geist Mono 9px/600 uppercase. Items: 13.5px/500, 16px icons (1.7px stroke — use **lucide-react**), radius 8px; active = surface-2 bg + 600 weight + `inset 2px 0 0 accent`; count badges (mono 9.5px; amber tone for attention e.g. "Invitations · 8"). Bottom: Settings, Light/Dark toggle (30×17 track), user card.
- **Header**: page title (14.5px/650) · **⌘K search pill** (min 200px, surface-2, kbd hint) · right: "● Saved · just now" (mono 10px) · Preview (outline) · **Publish** (coral solid → "Publishing…" → green "Live ✓").
- **⌘K command palette**: 560px, 14vh from top, dark scrim + blur 3px, pop-in 160ms. Searchable "Go to <module>" + actions (Add household, Remind pending, Export caterer sheet, Toggle dark mode). Esc closes, ⌘K toggles, auto-focus input. Suggest **cmdk**.
- **Dialogs replace every `window.confirm()/prompt()`** (guest-manager.tsx, website-editor.tsx, seating-manager.tsx): 420px card, title 16px/650, body 13.5px, Cancel (outline) + destructive (bad-red solid). Archive flows show a **toast with Undo** (dark toast, bottom-right, 4.2s, icon chip + optional coral Undo). Suggest **sonner** or a small custom toaster.
- Content container: max-width 1240px (up from 1060px), padding 28px.

### Module screens (all specified & interactive in the prototype)
- **Home**: greeting + attention count; date chip (serif date); readiness card (84px SVG ring, stroke 8, coral arc = `dasharray (score/100·213.6) 213.6`, rotate −90°) + amber-dot attention rows (navigate on click); 4 stat cards (Geist Mono 22px values); **Live activity** feed (color-dot + text + relative time).
- **Site editor**: toolbar (Pages dropdown pill, Desktop/Tablet/Phone segmented control, Style button) + 3-pane editor (170px block library with ⠿ drag handles / ivory canvas with hover coral outlines on blocks / 220px inspector: fields, accent swatches, per-event colors, "Draft · publish to go live").
- **Events**: 4-across joined card row (event dot, name, mono datetime, venue, visibility chip, cap chip) + "The weekend" timeline bar (event-colored spans, Thu 17–Sat 19).
- **Guest list** (the USP): summary line ("Showing 3 of 32 households · 86 guests · 73 invited"); search pill + filter chips (All active = ink solid); per-household cards: header (name 14.5/650, Bride/Groom chip, meta, hover-red Archive w/ trash icon) + **matrix grid** `minmax(220px,1.6fr) repeat(4,minmax(86px,1fr)) 44px`: column headers = event dot + name, **click toggles whole column** for that household; cells = 20px radius-6 toggles (coral solid ✓ / 1.5px outline empty), click toggles; guest row = name + child/+1 chips + email; row-end ✕ hover-red; "+ Add guest" footer row.
- **Invitations**: "Send 8 unsent" primary; table (Household / Guests / Status chip: Opened=green dot, Sent=gray, Not sent=amber / Last activity / Copy + WhatsApp row actions); selected row coral-tinted; right panel: link + Copy, QR placeholder + Download PNG, Email / WhatsApp / Revoke (red outline).
- **RSVPs**: "Remind 14 pending" + "Export caterer sheet"; per-event cards: **segmented bar** (green attending / red declined / amber pending of total), legend with mono counts, `att/cap seats`, Chase chips (hover amber); 3 roll-up cards: Meal choices (coral mini-bars), Dietary flags (amber dots, "included in caterer export"), Song requests.
- **Seating**: 3-col table cards (name, n/cap chip — green when full; guest pill chips, hover red = remove) + right rail Unseated (dashed rows, ⠿ drag affordance) + "Tell seated families" primary → toast. Production: real drag-and-drop.
- **Budget**: 3 stat cards (Total £42,000 / Committed £31,400 + coral bar / Paid £18,250 + green bar); table Line/Linked to/Estimate/Actual/Paid(green)/Status chip (Paid=green, Deposit-part=amber, Estimated=gray). Booked vendors auto-create lines (existing behavior — keep).
- **Vendors**: 4-column pipeline board (Shortlisted/Contacted/Quote in/Booked, dot-coded) with draggable cards (name, category, mono amount).
- **Tasks**: groups Overdue (red) / This week (amber) / Done (green); rows: 19px round check (click completes → toast), title (strike when done), event chip, HIGH priority chip (red soft), right-aligned due (red when overdue).
- **Files**: dashed dropzone + rows (colored ext tile PDF red / PNG blue / XLS green / DOC violet, name, meta, linked chip, Download).
- **Reports**: 5 CSV cards (coral CSV tile, title, description, ↓) — exact copy from current `reports/page.tsx`.
- **Settings**: Site card (name input, subdomain input with `.simvites.co.uk` suffix, template picker cards — serif names, coral border selected, RSVP deadline) + Danger zone (red-bordered card, "Archive site" red outline) + dark **Unlock card** (coral "Unlock · one payment", "Stripe · no subscription", 3 ✓ rows).

### 3 · Auth & onboarding (`Auth & Onboarding.dc.html`)
- **Sign in (3a)**: split screen. Left: logo, "Welcome back" 28px/650, Email link / Password segmented control (email link default), email input, coral "Send sign-in link", "No passwords needed" microcopy, divider, outline "Create your wedding site free". Right: near-black panel (grid texture + coral radial glow) holding an ivory invitation-card artifact (serif names, event rows with identity dots, maroon RSVP) + tagline "The tool is software. What your guests get is a keepsake." Same Supabase OTP/password flows as `login/page.tsx`.
- **Link sent (3b)**: 420px card — mail icon in coral-soft tile, address confirmation, expiry note, Resend outline, Go back link.
- **Onboarding (3c)**: one page, three numbered moves matching `onboarding-form.tsx` exactly: 01 couple/site name + slug with `.simvites.co.uk` suffix; 02 template picker (mini live-preview cards, coral 2px selected border, "+9 more looks" gallery tile); 03 the 9 starter celebrations as pill checkboxes (Wedding Ceremony + Reception preselected, coral-soft checked state). CTA "Create my site" + "Free while you build. Pay once when you send."

### 4 · Wedding templates (`Wedding Templates.dc.html`) — 10 new looks
Each template = palette + display face + per-event colour set + block styling, encoded as template-as-data (same pattern as `templates/template-one.ts`). Body face is always Instrument Sans; the display face carries the identity. Photo areas are user imagery slots.
| Id | Name | Display face | Palette (bg / primary / accent) | Mood |
|---|---|---|---|---|
| 4a | Midnight Baraat | Cormorant Garamond | `#0F1B32` / `#EFE6D2` / `#D4AF6A` | celestial navy + gold, night party |
| 4b | Garden Mehndi | Marcellus | `#F7F5EC` / `#2E5339` / `#7FA05F` | botanical arch, daytime outdoor |
| 4c | Gallery White | Instrument Serif | `#FFFFFF` / `#111110` / `#8C8C88` | photography-led minimal |
| 4d | Rose & Ash | Playfair Display | `#F6E7E4` / `#6E2231` / `#C4808E` | blush + burgundy romance |
| 4e | Rajwada | DM Serif Display | `#7A1024` / `#F8EAD8` / `#E8A33D` + `#D96A8B` | jewel-box maximalist, bandhani stripe bands |
| 4f | Coastline | Italiana | `#F2EDE3` / `#3E4E5C` / `#5B7485` | destination, tracked caps |
| 4g | Deco Champagne | Libre Bodoni | `#16130F` / `#F4ECDD` / `#E2C892` | art-deco double-rule frames + corner ticks |
| 4h | Terracotta Sun | Spectral 300 | `#F4E9DC` / `#7A3B22` / `#C4623A` + `#8A9B77` | boho arches, low sun circle |
| 4i | Ink & Jasmine | Instrument Serif | `#FBFBF9` / `#20211F` / `#4E7A57` | left-aligned letter, single green rule |
| 4j | Velvet Sangeet | Playfair Display | `#2E1836` / `#F2E4EE` / `#C97E4E` + `#7E4FA3` | plum velvet + copper, afterparty energy |
Each card in the file also shows: hero treatment, date/eyebrow style (Geist Mono tracked caps), divider motif, schedule row styling with event dots, RSVP button geometry (varies: pill / square / 2px radius per identity), and the 4-colour event set. Onboarding template picker and the app's Settings template cards should list all 12.

## State management (per prototype)
Shell: `activeModule`, `dark`, `cmdOpen/cmdQuery`, `toasts[]`, `dialog`, `publishState: draft|publishing|live`. Guests: households→guests→cells matrix with optimistic cell/column toggles (existing `setInvitation` server action + rollback pattern in `guest-manager.tsx` already does this — keep it, restyle it). Invitations: `selectedHousehold`. Tasks: done toggles. All demo data in the prototype's `renderVals()` maps 1:1 to the existing Supabase queries.

## Assets
- Google Fonts: Instrument Sans, Instrument Serif, Geist Mono (swap via `next/font/google`).
- Icons: lucide-react (16px, stroke 1.5–1.7) — replaces ALL emoji/unicode icons (📄 ✏️ 🙈 🗑 ✨ ▶ ❚❚ ✕ ✦).
- QR placeholders → existing `qrcode` package output.
- Template preview imagery: striped placeholders in mocks → real template screenshots/photos in production.

## Codebase mapping (simvites repo)
| Prototype | Implements in |
|---|---|
| Landing scenes 1–5 | `app/page.tsx` (delete orbs/marquee; new scroll sections) |
| 22s demo | `app/tour/flow-player.tsx` → rewrite as timeline-driven `<LiveDemo>`; reuse on `/tour` |
| Tokens light+dark | `app/globals.css` `@theme` + `:root`/`.dark` values; delete global pill-button override + hover-jiggle rules |
| Sidebar/header/⌘K | `components/app/sidebar.tsx`, `app/(app)/layout.tsx`, new `components/app/command-menu.tsx` |
| Dialog/toast/badge/chip | new `components/ui/` primitives; replace every `confirm()`/`prompt()` |
| Module screens | each `app/(app)/<module>/` page/client component, keeping existing server actions |
| Sign in 3a–3b | `app/login/page.tsx` |
| Onboarding 3c | `app/onboarding/onboarding-form.tsx` (same fields/actions, new layout; template picker lists 12) |
| Templates 4a–4j | new entries alongside `templates/template-one.ts` (template-as-data: palette, fonts via `next/font`, per-event colour sets); expose in onboarding + Settings pickers |
Suggested build order: tokens+fonts → shell primitives → Guests matrix → Invitations/RSVPs → remaining modules → auth/onboarding → landing → demo → templates (ship 2–3 first, rest behind a flag).
New Google Fonts used by templates: Cormorant Garamond, Marcellus, Playfair Display, DM Serif Display, Italiana, Libre Bodoni, Spectral — load per-template (only the active template's face), not globally.

## Files in this bundle
`Landing (Deep Zoom).dc.html` · `App Redesign.dc.html` · `Auth & Onboarding.dc.html` · `Wedding Templates.dc.html` · `UI-UX Audit.dc.html` · `Landing Directions.dc.html` · `Current UI (Audit Base).dc.html` · `support.js` (runtime; keep beside the .dc.html files so they open in a browser).
