# Simvites — Design Review Brief

A complete inventory of every page, screen and feature, for UX/UI review.
Live build: **https://simvites.vercel.app** (path-based; no custom domain yet).
Local: `npm run dev -- -p 3100` → http://localhost:3100.

**Private repo — do not publish this file or the test credentials.**

## Design doctrine (judge against this)

- **One family, two voices.** The TOOL (couple's workspace) is neutral 2026 SaaS:
  Instrument Sans + Geist Mono, coral accent `oklch(0.62 0.21 29)`, warm ivory
  light mode (`#FAF8F3`) / slick navy dark mode (`#0A1220`), 8px controls,
  hairlines, no hover jiggle. The ARTIFACT (couple's public site, RSVP,
  invitations) is romantic serif/ivory, template-driven, isolated at
  `[data-site-root]`.
- **Zero-code couples.** Every control must be self-explanatory to a non-designer
  planning a wedding on their phone at midnight.
- **Easy but not limited.** Curated presets first (vibes, looks), full granular
  control one fold deeper.

## Review lenses

1. Is it obvious how to do things? (the founder's #1 criterion)
2. Is it welcoming — does it lower anxiety for a stressed couple?
3. Does it read as a modern SaaS you'd pay for?
4. Do pages link well — can you always tell where you are and what's next?
5. Light AND dark mode; 375px, 768px, desktop; empty AND populated states.

## Test accounts (all password-based)

| Account | Purpose |
|---|---|
| `maharshi.sim@hotmail.com` / `Simvites2026!` | Founder. Fully activated demo "Aanya & Dev" (also platform admin → /admin) |
| `newbie@occasio.test` / `Occasio2026!` | Fresh, locked site "Zara & Kabir" — empty states + onboarding checklist. **Legacy address:** this account predates the Simvites rename and is not created by any seed script, so it has to be recreated by hand as `newbie@simvites.test` — every `Occasio` string in the codebase itself is gone. |
| `demo@simvites.test` / `SimvitesDemo2026!` | Draft-stage site "Riya & Arjun" (Editorial Luxury, comped unlock) |
| `scale@simvites.test` / `ScaleTest2026!` | Scale test: 5 sites, flagship 150 households / 359 guests |

---

## 1 · Marketing (public)

| Route | What it is | Check specifically |
|---|---|---|
| `/` | Deep-zoom scroll landing: hero → navy dive → module tunnel → ivory portal → templates scene → USP duo → what-you-get (6 cards) → FAQ (8 accordions) → pricing → footer | Scroll choreography at several positions; LiveDemo 22s simulated editor loop; **dark toggle in nav pill** (full navy treatment); mobile nav pill never wraps; headline never clipped |
| `/tour` | "How it works": the LiveDemo 22s editor loop + plain-English element guide | Demo loop plays; every element explained |
| `/preview` | Gallery of all 18 templates | Cards genuinely distinct (fonts, button shapes, dividers, case — not just colour) |
| `/preview/[template]` | Full-page single template preview ×18 | Try `editorial-gold`, `peacock-court`, `saffron-disco`, `lotus-milk`, `henna-noir`, `marigold-morning` |
| `/login` | Split screen: ivory invitation card on near-black; magic-link / password tabs; signup switch; forgot password | 420px link-sent state; error states |
| `/auth/reset` | Set a new password after reset email | |
| `/onboarding` | 3 moves: name the couple → pick template (18 cards w/ preview links) → pick starter events (9 options) | First-run feel; template picker parity with /preview |

## 2 · Couple workspace (sign in required)

| Route | What it is | Check specifically |
|---|---|---|
| `/dashboard` | Command Centre: **5-step onboarding checklist** (fresh accounts only), readiness ring + attention links, 6 stat cards, live activity feed | Checklist on `newbie@…`; hidden on founder; headline copy tiers by score |
| `/website` | **The Puck editor** — the money screen. Toolbar: Design menu (18 template swatch cards + preview links + one-click switch), Pages menu (add/rename/hide/delete), device toggle (desktop/tablet/phone), Style panel (**4 vibe cards** → "Fine-tune" fold: 16 heading × 10 body fonts, 3 colour pickers **with hex inputs**, 6 button designs, 4 menu designs, glow/hover/backdrop), Upload image, **? help sheet**, dismissable coach strip, status pill, Publish. Canvas: hover = dashed coral + name chip; selected = 2px coral ring; ＋ Add-below pill; inline text editing; per-block Style group (10 looks, borrow-a-template's-palette, accents, animations); **AI section** (needs key); **Add section** presets; **Freeform canvas block** (drag/resize items, shape-locked on mobile); undo/redo | Panels span to bottom, page itself never scrolls; block library reads as cards; only ONE Publish button in the editor row; empty-canvas hint on a new page |
| `/events` | Quick-add + list | |
| `/events/[id]` | Event hub: full form (venue, capacity, dress code, RSVP deadline, accent) + connected tabs: itinerary / guests / rsvp / vendors / budget / tasks / files | Tabs show real linked data |
| `/guests` | Households + guests, **invite matrix** (guest × event checkboxes, header click = whole column), search + side filter chips + "Showing X of Y", paste-import wizard (AI-assisted), archive w/ Undo toast | On scale account: 150 households render fast, counts exact |
| `/invitations` | Per-household private links (shown once), QR download, guarded email send, revoke, opened badges | |
| `/rsvps` | Per-event segmented bars (attending/declined/pending), capacity, chase list, answer roll-ups, text answers, "Remind pending households" | Numbers vs invited counts on scale account |
| `/messages` | Two-way SMS/WhatsApp inbox, one thread per household (guarded until Twilio keys) | Not-configured state |
| `/assistant` | AI planning chat over the couple's real data (guarded until Anthropic key) | Not-configured state |
| `/vendors` | Tabs: My pipeline (status groups, quick-add, import) \| **Recommended** (curated directory, category chips, mentions, **🎁 partner discounts w/ tap-to-copy promo code**, one-click adopt) | Discount banner on Saffron & Sage |
| `/vendors/[id]` | Vendor detail: money, event coverage, linked budget/tasks | |
| `/budget` | Category groups, est/actual/paid/left totals, inline edit, event+vendor links | |
| `/payments` | Month-grouped instalments, mark-paid (**syncs budget line**), overdue red / due-soon amber, reminder days | |
| `/tasks` | **Progress header (X of Y · % bar + overdue chip)**, groups, quick-add, starter pack | |
| `/seating` | Visual floor-plan canvas: upload plan, drag tables, round/long, seat guests by name, per-event filter, send-to-guests | Drag persists |
| `/files` | Private uploads, signed downloads, link to event/vendor; **teaching empty state** (4 what-belongs-here cards) | Empty state on fresh account |
| `/save-the-date` | Designer: headline/names/date/photo/6 palettes/combine events → publish → share (link/WhatsApp/email/QR/print) | |
| `/reports` | **Live hub**: stat row (guests/attending/budget/open items) + 6 export cards w/ icons + real row counts | |
| `/settings` | Site name, RSVP deadline default, Connections status, billing/unlock card (price from DB), collaborators, version history + restore, change password | Locked vs unlocked states (newbie vs founder) |
| `/templates` | The look, promoted out of Settings: 18 real previews, in-use badge, apply + open full preview | Was 18 radio cards on the settings page |

## 3 · Guest-facing (public, per site)

| Route | What it is | Check specifically |
|---|---|---|
| `/s/aanya-and-dev` | Published demo site (Golden Hour + petals backdrop, banner nav, custom pink accent, outline buttons, velvet + borrowed-palette story, Grand Arch gifts, freeform sign-off) | All 10 block looks & backdrops render; nav variants; OG title |
| Scale sites | `/s/aria-and-kabir` (navy+shimmer), `/s/meera-and-jay` (garden+petals), `/s/zoya-and-arjun` (rajwada), `/s/layla-and-sam` (coast+aurora), `/s/nadia-and-ethan` (deco+mesh) | Five genuinely different weddings |
| `/s/[slug]/[page]` | Extra pages (e.g. travel) with site nav | |
| `/s/[slug]/i/[token]` → `/s/[slug]/rsvp` | Invite link → cookie → **the RSVP flow**: per-person per-event yes/no (≥44px targets), typed questions, deadline read-only, capacity full, sticky submit, confirmation w/ **PDF + QR**, add-to-calendar, WhatsApp share | The single most important guest screen; check at 375px in the site's template vars |
| `/s/[slug]/schedule` | Guest "My schedule": household's events, running order, going/awaiting, seats, calendar links | Fallback card without session |
| `/std/[token]` | Public Save-the-Date card (`/std/sTAeytnmVxXR`) | Print stylesheet |

## 4 · Platform admin (founder only)

| Route | What it is |
|---|---|
| `/admin` | Stats (customers/sites/users/unlocked/revenue/RSVPs), **price editor (£, live to checkout)**, link to directory, per-site cards: comp/revoke unlock, +18mo, archive/restore, password reset, view site |
| `/admin/directory` | **Curated supplier CRUD**: add/edit/hide/feature, category, price band, contacts, **discount + promo code** |

## 5 · Cross-cutting systems

- **App shell**: 230px grouped sidebar (13 modules, badges for unsent invites), glassy header (page title, ⌘K command palette, notification bell w/ tone dots, Preview, Publish), mobile hamburger drawer.
- **Overlays**: toasts (with Undo actions), confirm/prompt dialogs — no native alerts.
- **Theming**: light ivory / dark navy everywhere in the tool; templates immune to app dark mode.
- **Scrollbars**: thin, trackless, platform-wide.
- **Emails** (guarded): invitation, reminder, seating update — Occasio-styled HTML.
- **Exports**: 6 CSVs (guests, RSVPs-by-event w/ question columns, budget, payments, vendors, tasks).
- **Guarded integrations**: Stripe checkout, Resend email, Twilio messaging, Anthropic AI — every one must show a friendly "not connected yet" state, never an error.

## Known gaps (don't re-report)

- No custom domain / wildcard subdomains yet (Vercel Hobby, path URLs).
- Stripe/Resend/Twilio/Anthropic keys not set in prod — guarded states show.
- Landing footer legal links are placeholders pre-launch.
- One site per account (`getPrimarySite`) — multi-site switcher is post-launch.
