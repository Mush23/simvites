# Review v2 evidence log (11 July 2026)

## Headline: codebase UNCHANGED since v1 (9 July). All 13 v1 findings re-verified OPEN.
Re-checked in source: no --radius-pill token (globals @theme has sm/md/card/lg only); un-layered button 8px override intact; "Twelve looks" headline intact; editor toolbar unchanged (ImageUploader + 2 Publishes: app-header + toolbar #publish-site); dashboard styled-detection unchanged; ANTHROPIC_API_KEY copy in assistant-chat + AiSectionMenu note; guests archive 9px mono + Promise.all column toggle; emoji device labels (DEVICES const); scrollbar `*` selector; accent-soft rgba hardcode; login dup CTAs; rsvp locked chip raw status + truncated sticky error (line ~225 truncate).

## V2 NEW findings (from extended coverage)

N1 (P2) Admin: irreversible one-click actions — Comp/Revoke unlock, Archive site, +18 months, Reset password (prints temp pw) fire with NO askConfirm, in the screen whose own copy says "handle with care". admin/page.tsx server-action forms, reset-button.tsx.

N2 (P2) Hover jiggle in the TOOL violates its own doctrine ("NO hover jiggle", "motion only inside the artifact"): events/page.tsx list cards + events/[eventId] Row links (hover:-translate-y-0.5), error.tsx + not-found.tsx CTAs (hover:-translate-y-px). Artifact-side jiggle (site blocks, rsvp buttons, gallery zoom) is doctrine-legal.

N3 (P2) Stale "twelve looks" x2: preview/page.tsx headline + tour/page.tsx ELEMENTS copy — 18 templates exist. (Upgrades v1 F3.)

N4 (P2) A11y cluster on the input layer: overlays dialogs + ⌘K palette lack role="dialog"/aria-modal/focus-trap (Esc + backdrop + arrow-nav are good); toast stack has no aria-live; ⌘K has no touch trigger on mobile (header search pill hidden <sm) → palette unreachable on phones.

N5 (P3) image-field.tsx already solves photos in-place (upload + "Find a photo" search→bucket import + click-to-set focal point) — the toolbar ImageUploader ("link copied — paste it") is pure legacy duplication; strengthen F4. Also image-field/PagesMenu-Add/presets/AI/brand-kit buttons wear dead rounded-pill; image-field inline fallbacks use pre-overhaul terracotta #B4552D.

N6 (P3) FlowPlayer is dead code: tour/page.tsx renders LiveDemo; flow-player.tsx never imported (grep). The BRIEF's known-gap note ("/tour still uses older FlowPlayer") is itself stale — tour is current. Cleanup + credit.

N7 (P3) /preview/[template] "Use this template" → /login; onboarding never receives the choice (radio defaultChecked={i===0}, no ?template= param) — couple re-picks. onboarding-form.tsx.

N8 (P3) Loading skeleton max-w-[1060] vs module pages max-w-[1240] — width jump when content lands. loading.tsx.

N9 (P3) "Radius by side-effect": PriceEditor Set-price, ResetButton output, password-form submit, AI-menu Write-it/Cancel, editor Publish btn carry NO radius class — they depend on the global button override; deleting it (the F2 fix) silently squares them. Codemod both together.

N10 (P3) EventForm "Saved" eyebrow never auto-clears; itinerary arrows/delete are 28px targets (aria-labelled, desktop-fine).

## V2 CREDITS (verified good, new coverage)
- Event hub /events/[eventId]: 8 real-link tabs + aria-current, read-only connected views per tab, each with "Manage →" out-link. (F17 stands: modules never link BACK to hubs.)
- i/[token] route: peppered hash lookup, 20/min IP rate-limit, revoked/expired states, best-effort invite_opened tracking, clean-URL redirect, 180-day HttpOnly cookie. rsvp/page.tsx renders warm invalid/revoked/expired copy (LINK_MESSAGES).
- Public site page: OG "— you're invited" metadata for WhatsApp previews; personalised household greeting via guest cookie.
- RSVP page themes money path in site tokens + "View your personal schedule →" cross-link; deadline-passed read-only mode; CalendarRow g/ics.
- Overlays: toast queue w/ Undo + tones, confirm/prompt promises, Esc/backdrop, destructive-red default confirm.
- ⌘K palette: nav + preview + theme-toggle commands, kbd hints footer, 560px/14vh spec-true.
- error.tsx / not-found.tsx / loading.tsx: warm recoverable voice, guest-aware 404, calm aria-busy skeleton.
- Editor internals: ⌘S flush, EmptyCanvasHint, dropped Puck Publish (comment: 3 confused everyone), vibes→fine-tune fold, ColorPick debounced native picker + paste-a-hex + reset-to-template, brand-kit monogram upload/initials.
- Admin: price editor sans deploy; honest Stripe-coupons note; per-site health counts; select-all temp password.
- Scale seed confirms flagship aria-and-kabir 150 households / 300+ guests.

## Grade deltas v1→v2
Lens 1 B− (unchanged), Lens 2 A− (unchanged; admin no-confirm dings founder-side only), Lens 3 B− (jiggle + stale copy widen the gap), Lens 4 B→B+ (hub better than v1 assumed; still one-directional + mobile palette gap), Lens 5 B+ (a11y asterisk: dialogs/toasts).

## Deliverables inventory (all in project root)
- Design Review.dc.html (v1) · Design Review v2.dc.html (this pass)
- Recreations: Workspace / Editor / Guest / Marketing (4 files, unchanged — product unchanged)
- Redesigns.dc.html: R1 editor 1a/1b/1c · R2 guests 2a/2b/2c · R3 RSVP 3a/3b/3c (option ids referenceable in chat)
