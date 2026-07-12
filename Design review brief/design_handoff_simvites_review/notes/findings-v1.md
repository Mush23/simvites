# Review working notes (evidence log — source-verified)

## Scope (user answers)
Review first then redesigns · 3 variations per redesigned screen · doctrine open to challenge · light+dark, 375/768/desktop, empty+populated all matter · audience: founder + implementing dev · code only, no live screenshots.

## Code-level findings (verified in source)

### F1 — `rounded-pill` is a dead class (HIGH, systemic)
`rounded-pill` used across guest-manager (side badge), events page (visibility/cap badges), tasks (high-priority chip), files (kind chip), rsvp-flow (locked-status chip, table pill, confirmation check circle 64px, welcome chip on hero), editor (ImageUploader label, PagesMenu Add btn, undo/redo cls, presets/AI buttons, StylePanel brand-kit buttons). NO `--radius-pill` token or `@utility rounded-pill` exists anywhere (grepped). Tailwind v4 ⇒ class not generated ⇒ these render SQUARE. Guest-facing confirmation "circle" renders as a square box.

### F2 — Radius chaos: 18px links vs 8px buttons (MED, systemic)
@theme sets `--radius-lg:18px`. Un-layered global CSS forces ALL buttons to 8px (beats layered utilities). Result: `<a>` with rounded-lg (sidebar NavLinks, header Preview link, notification rows, guest search input...) = 18px; sibling `<button>`s = 8px. Header: Preview (a, 18px) sits next to Publish (button, 8px). Doctrine says "8px controls".
Also: chips-as-buttons (`rounded-full` on side filters, palette pickers, category chips, assistant suggestions) are forced to 8px squares — only span/a chips stay pills (vendor status, notification badge). Mixed pill/square chip language everywhere.

### F3 — Preview gallery headline: "Twelve looks, one wedding" with 18 templates (LOW, copy bug). Also brief says gallery must show all 18 — it does (TEMPLATES.map).

### F4 — Editor toolbar overload (HIGH, UX)
One row: Website label + Design menu + Pages menu + device toggle + Style + Upload image + ? + status + View live + Publish; PLUS Puck headerActions row (AI section, Add section, Undo, Redo) renders in a second cluster. Coach strip below. Founder's own E1/E2 comments admit "not intuitive" history. Upload-image → clipboard → paste-into-field flow is a workaround pattern (help sheet documents it: "Upload image copies a link — paste it into any photo field").

### F5 — Dashboard checklist step 1 "Choose your look" `styled` detection requires theme change — a couple happy with the default template can never tick step 1 (readiness logic quirk, GettingStarted.styled).

### F6 — Landing: hero CTA "▶ Watch the 60 second take" links to #product (the scroll section itself) — no video; the LiveDemo is 22s not 60s (copy mismatch).

### F7 — RSVP flow: locked-deadline chip shows raw status word lowercase ("attending") vs styled labels elsewhere; capacity-full disables "Joyfully yes" at 40% opacity with mono warn note (good); typed-questions asterisk = accent-ink; missing-answers error only surfaces in sticky bar truncated to one line ("Please answer: X · Y…" truncate).

### F8 — Invite matrix: column-header toggle fires N sequential setInvitation calls (Promise.all) then full refresh — on 150-household scale account each row's cell state keyed by invitedEventIds join (remount per change). Archive affordances are 9px mono uppercase text buttons (tiny targets <44px). Guest ✕ archive same.

### F9 — Guests toolbar: "Add household" form is the hero position (top-left card) even for populated accounts; search + filters render BELOW the add-form card and only when households exist. On scale account finding someone = scroll past creation UI. Counts chip is mono-tracked uppercase (dead-pill style ref).

### F10 — Sidebar: 13 items + Settings across 5 groups at 230px. Badge only for invitations/payments. Site switcher = static display (multi-site post-launch, known gap). Appearance toggle buried in footer.

### F11 — Header search pill dispatches 'open-command-menu' event (⌘K palette exists) — but no visible affordance on mobile (pill hidden sm:flex).

### F12 — Messages/Assistant guarded states are friendly (banner + empty card) ✓ matches brief requirement; assistant not-configured card shows env-var name `ANTHROPIC_API_KEY` to a couple (dev leakage in couple-facing copy).

### F13 — Editor device toggle labels use emoji (🖥 ⬛ 📱) vs lucide-icon language everywhere else; landing what-you-get cards also emoji (🕌 ✉️ 🪑 💷 🤖) — doctrine says emoji not part of tool voice (mono/lucide).

### F14 — Two Publish buttons visible simultaneously in editor route: app header Publish + editor toolbar Publish (source dropped Puck's third, comment says "three Publish buttons confused everyone" — still two).

### F15 — Login right panel invitation card: RSVP block is Editorial-Gold maroon (#7A1F1F) — brand moment good; but 'KINDLY RSVP' span square (intentional print look?). Left CTA duplication: "Create your wedding site free" button + "Create one" link both present on password tab.

### F16 — Landing footer legal links '#' placeholders (known gap, don't re-report).

### F17 — Cross-nav: brief lens 4 (wayfinding). Module pages have no breadcrumbs/next-step links except dashboard attention links; event hub tabs are the connective tissue (not yet recreated: /events/[id]).

### F18 — accent-soft in light mode = rgba(222,71,38,0.08) but --accent is oklch(0.62 0.21 29) ≈ #DE4726 — soft tokens hardcode the rgb; if accent changes they drift (minor token hygiene).

### F19 — Whisper scrollbars global `*` selector also restyles the couple's PUBLIC site scrollbars (artifact isolation leak, contradicts "templates immune to app" doctrine — minor).

### F20 — Countdown zeros-until-mounted with opacity 0.6 — good hydration hygiene ✓. Ken Burns on [data-hero] ≥640px ✓.

## Positives to credit (so review reads fair)
- Token discipline (one palette family, semantic vars, dark mode complete, artifact isolation via [data-site-root]).
- Guarded integrations all have friendly states.
- Overlays: no native alerts; toasts with Undo everywhere; askConfirm/askPrompt.
- RSVP flow: ≥44px targets, optimistic cells w/ rollback, capacity + deadline honored server-side, PDF + calendar + WhatsApp.
- Copy voice is warm and specific ("Your path to the big send", "so nothing sneaks up on you").
- Files teaching empty state; reports row counts; readiness ring; per-event accent system carried everywhere (dots).
- Editor: vibes-first Style panel matches "easy but not limited"; help sheet + coach strip; single-source Publish states; empty-canvas hint.

## Recreation inventory (for review doc links)
- Recreation — Workspace.dc.html: 16 screens × light/dark × founder/newbie. (events/[id] hub + admin NOT recreated.)
- Recreation — Editor.dc.html: toolbar, 18-template design menu, pages, vibes+fine-tune style panel, presets, help, device toggle, canvas w/ selected Story + fields panel.
- Recreation — Guest.dc.html: published site (petals/banner/pink/outline/velvet/arch/freeform), RSVP 375px in iOS frame (form+confirmation), schedule, /std card.
- Recreation — Marketing.dc.html: landing (full scroll dive + 22s LiveDemo loop), login (form + link-sent), onboarding, /preview gallery (18 real-token cards).
- Not recreated: /events/[id] hub, /vendors/[id], /admin + directory, /tour (known-gap FlowPlayer), /preview/[template] full pages, /auth/reset.

## Data notes
Demo data is representative (Aanya & Dev, 4 events w/ accents #3E7C4F/#6D3FA9/#C9A227/#7A1F1F, Shah/Patel/Kapoor households); counts consistent across screens (54 hh, 112 guests, 38 responded, 89 attending).
