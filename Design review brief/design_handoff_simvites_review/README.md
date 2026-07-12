# Handoff: Simvites design review — fixes + redesigns

**Target codebase:** the `simvites` repo (Next.js App Router · Tailwind v4 · Supabase · Puck editor).
**Audience:** a developer (or Claude Code) implementing the review's fixes and the chosen redesigns directly in that repo.

## Overview

A two-pass UX/UI review of the whole product (marketing → couple workspace → Puck editor → guest-facing → admin), judged against the project's five lenses and its design doctrine (`app/globals.css` header comment + `docs/DESIGN-REVIEW-BRIEF.md`). Every finding cites the source file. Four interactive recreations prove the current state; four redesign turns (R1–R4, options `1a`…`4c`) propose fixes at three ambition levels each.

## About the design files

The `.dc.html` files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and behavior, NOT production code to copy. The task is to **apply the findings and recreate the chosen redesign options inside the existing simvites codebase** using its established patterns: Tailwind v4 utilities over the semantic tokens in `app/globals.css`, lucide-react icons, the overlay primitives in `components/ui/overlays.tsx`, existing server actions. Open them in any browser (keep `support.js` beside them).

- `Design Review.dc.html` — pass 1: verdict, 13 ranked findings with dev notes, section notes, doctrine challenges
- `Design Review v2.dc.html` — pass 2: re-verification status board, 10 new findings, order of work
- `Redesigns.dc.html` — R1 editor (1a/1b/1c) · R2 guest list (2a/2b/2c) · R3 RSVP money path (3a/3b/3c) · R4 admin (4a/4b/4c)
- `Recreation - *.dc.html` — faithful rebuilds of the current UI (evidence; do not implement)
- `notes/findings-v1.md`, `notes/findings-v2.md` — raw evidence logs with exact file/line pointers

## Fidelity

**High-fidelity.** The redesign options use the product's real tokens (colors, type, radii below) and real copy. Recreate them pixel-faithfully **but always via the codebase's existing Tailwind tokens** (`bg-surface`, `text-ink-2`, `border-line`, `rounded-md`…), never hardcoded hex. Where a redesign shows a value that has no token yet (noted inline), add the token first.

## The fix backlog (implement in this order)

### Batch 1 — P1, same day

1. **Dead `rounded-pill` class** — used ~27× across 12 files (incl. `components/site/blocks.tsx:54` on the couple's PUBLIC site and the RSVP thank-you "circle" `app/s/[siteSlug]/rsvp/rsvp-flow.tsx:116`), but no `--radius-pill` token exists, so Tailwind v4 generates nothing → squares.
   **Fix:** add `--radius-pill: 999px;` to the `@theme` block in `app/globals.css`. Acceptance: `grep -rn "rounded-pill"` elements render fully round; the RSVP confirmation check is a circle.
2. **Radius unification** — `--radius-lg` is 18px while an un-layered global rule forces all `<button>`s to 8px (beats utilities). Links (18px) sit beside buttons (8px); `rounded-full` chips-as-buttons get squared.
   **Fix:** set the radius scale to the doctrine (sm 6 / md 8 / lg 10 / card 12 / pill 999), delete the global button radius override, and in the SAME commit give every `<button>` without a `rounded-*` class an explicit `rounded-md` (grep `<button(?![^>]*rounded)`) — v2 finding N9 lists the buttons that would silently go square otherwise (PriceEditor, ResetButton, password form, AI menu, editor Publish).
3. **Editor toolbar** — implement option **1a** (zoned toolbar) from `Redesigns.dc.html#1a` in `app/(app)/website/website-editor.tsx`: three zones (Site: template/pages/style · View: device icons · Ship: status/View live/Publish); ONE Publish (hide the app-header one on /website); delete the toolbar `ImageUploader` + its help-sheet row (photos already solved in-field by `lib/puck/image-field.tsx`); lucide `Monitor/Tablet/Smartphone` instead of emoji; canvas actions (Add section/AI/Undo/Redo) as one floating group top-right of the canvas.
4. **Guest list, search-first** — implement option **2a** from `Redesigns.dc.html#2a` in `app/(app)/guests/guest-manager.tsx`: search + side chips + counts as the top bar; "Add household" demoted to a button opening the form; archive/remove actions become ≥44px icon buttons with tooltips (12px+ text, never 9px mono); batch the whole-column invite toggle into one server action (new action in `guests/actions.ts` taking `householdId × eventId × invited`).

### Batch 2 — P1/P2 copy + guardrails, same day

5. Copy sweep, one commit: `preview/page.tsx` + `tour/page.tsx` "Twelve looks" → non-numeric or `TEMPLATES.length`-derived; landing `page.tsx` "Watch the 60 second take" → "▶ Watch it build a site — 22s" (anchor to the demo frame, not `#product` top); `assistant-chat.tsx:47` + `website-editor.tsx:480` ANTHROPIC_API_KEY → human copy ("The assistant isn't switched on yet — it's coming with early access"); `rsvp-flow.tsx` locked chip raw status → mapped labels ("Going ✓" / "Can't make it").
6. **Admin confirms** — wrap Comp/Revoke/Archive/+18mo/Reset in `app/admin/page.tsx` + `reset-button.tsx` with the existing `askConfirm` (destructive). Then, if adopting R4: **4a** adds the graphite identity band + search/status chips; **4b** = sites-as-table; **4c** = separate ops theme (bigger bet).
7. **Motion sweep** — remove tool-side hover jiggle: `events/page.tsx`, `events/[eventId]/page.tsx` (Row), `error.tsx`, `not-found.tsx` — replace `hover:-translate-y-*` with border/background shifts. Acceptance: `grep -rn "hover:-translate"` only matches under `components/site/` / `[data-site-root]` scopes.

### Batch 3 — P2 a11y + plumbing, next day

8. `components/ui/overlays.tsx` + `components/app/command-menu.tsx`: `role="dialog"` + `aria-modal="true"` + focus trap; `aria-live="polite"` on the toast container; add a mobile search icon button in `app-header.tsx` (visible `<sm`) dispatching `open-command-menu`.
9. Dashboard checklist step 1 (`dashboard/page.tsx`): mark `styled` true once the editor has been opened or on first publish — not only on theme mutation.
10. Scope whisper scrollbars in `globals.css` so `[data-site-root]` (the couple's artifact) is excluded.

### Batch 4 — P3 polish, during the week

11. Delete dead `app/tour/flow-player.tsx`; update the brief's known-gaps note.
12. Carry `?template=` from `/preview/[template]` through login → onboarding preselect (`onboarding-form.tsx` `defaultChecked`).
13. `loading.tsx` width 1060 → 1240 to match modules.
14. accent-soft/line as `color-mix(in oklab, var(--accent) …)` instead of hardcoded rgba.
15. Module→hub backlinks (budget rows + payments link to their event hub); event hub: capacity vs attending headline on the RSVP tab; EventForm "Saved" auto-clear; Save-the-Date public stage tinted from the card palette; login password tab drop the duplicate "Create one" link.

### Bigger redesign bets (after the backlog)

- **R2 option 2b/2c** — guest register table with sticky headers + household drawer / per-event lens view.
- **R3 option 3b** — keepsake RSVP confirmation in the couple's template; **3c** — inline per-question validation replacing the truncated sticky-bar error.
- **R1 option 1b/1c** — left-rail editor consolidation / floating-dock "artifact is the interface".

## Design tokens (already in `app/globals.css` — the fixes above only ADD `--radius-pill` and adjust the radius scale)

- Ink ivory theme: `--paper #FAF8F3 · --paper-2 #F3EFE6 · --surface #FFF · --surface-2 #F4F1E9 · --ink #1A1916 · --ink-2 #6B675E · --ink-3 #928D81 · --line #EAE5DA · --line-2 #DCD5C6`
- Dark navy theme: `--paper #0A1220 · --surface #111C33 · --ink #EEF2FA` (+ companions, see globals)
- Accent coral `oklch(0.62 0.21 29)` / dark `oklch(0.68 0.19 30)`; status `--ok #1B9E5F · --warn #B87A1E · --bad #D2402A` (review recommends moving --bad toward crimson, doctrine challenge #1)
- Type: Instrument Sans (UI) · Geist Mono (data/labels, ≥10px, interactive ≥12px) · Instrument Serif ("artifact quotations": couple names, money moments). Artifact templates bring their own faces.
- Radius target: 6/8/10/12/999. Shadows: `0 1px 2px rgba(30,25,15,0.05)` cards, `0 40px 90px -20px rgba(20,16,8,0.45)` overlays.

## Assets

No binary assets. `ios-frame.jsx` / `image-slot.js` / `support.js` are prototype scaffolding only — do not port. All icons are lucide-react (already a dependency).

## How to run this with Claude Code

1. Download this folder and drop it into the repo root as `design_handoff_simvites_review/`.
2. `cd` into the repo, run `claude`, and paste:

> Read design_handoff_simvites_review/README.md and the two notes files. Implement "The fix backlog" batch by batch, in order, one commit per numbered item (batch 5 is one commit). Before each change, open the cited source file and confirm the finding still exists. After each batch, run the acceptance checks in the README (greps + visual states listed). The .dc.html files are design references — open Redesigns.dc.html for options 1a, 2a, 4a which are the approved targets; match them using our existing Tailwind tokens and components, never hardcoded values. Ask me before starting the "Bigger redesign bets".

3. The two review `.dc.html` docs are the rationale if Claude Code needs the "why" behind any item.
