# Templates

A template = **data**: a CSS-variable theme applied at `[data-site-root]` + a
starter Puck document. Every block in `components/site/` consumes the same
semantic tokens, so all blocks work under every template. Registry:
`lib/templates/registry.ts`. Fonts pool: `lib/template-fonts.ts` (Cormorant,
Jost, Fraunces, Inter via next/font).

| Template | Origin | Identity |
|---|---|---|
| **Editorial Gold** | The founder's own wedding site (maharshipatel.co.uk) — the product's origin story | Cormorant Garamond + Jost · cream / gold hairlines / deep-red actions · per-event accent palettes |
| **Editorial Luxury** | The commissioned `files/` design-token system | Fraunces + Inter · ivory / ink / brass hairlines · ink primary buttons, pill for chips only |

Chosen at onboarding (with starter events); stored in `sites.theme.template`;
serialised into every publish snapshot, so published sites are immutable to
later template edits until re-published. The editor renders the true theme
(WYSIWYG: Puck iframe disabled + theme vars on the canvas wrapper).

## Functionality captured from the original wedding site

Countdown · Story · Families · per-event accent schedule cards · Gallery with
keyboard lightbox · rich Hotel/Travel card (block code, booking, maps) · gifts
note · personalised hero greeting via the guest cookie · RSVP confirmation
**PDF + QR** keepsake · add-to-calendar (Google + .ics) · invite-**open
tracking** ("opened, not responded") · WhatsApp link sharing.
Upgraded beyond the original: server-enforced caps/invites (tested, race-proof),
hashed peppered tokens, typed RSVP questions, exports, planning modules.

## Portfolio note — never ship the original repo

`MushWedsSim-main` / `maharshi-simran-wedding` contain **real guest names,
phone numbers and a live backend URL** (in git history too). The showcase is
the fictional **Aanya & Dev** demo on this platform wearing Editorial Gold.
