# Simvites

Multi-tenant SaaS **event-website builder** — beautiful wedding & event sites
with a real per-event RSVP engine, personalised invitations and live updates.
Beachhead: **South Asian multi-event weddings**.

> Productises the RSVP/guest engine from a shipped single-wedding site. This is
> a fresh, multi-tenant codebase — not a fork of that project.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + React 19, on Vercel |
| Styling | Tailwind v4, OKLCH design tokens, light + dark |
| Visual editor | Puck (`@measured/puck`) — block-based, responsive |
| DB / Storage / Auth | Supabase (Postgres + Storage + Auth + RLS) |
| Payments | Stripe |
| Email (later) | Resend |
| Multi-tenancy | `*.simvites.co.uk` wildcard + middleware (vercel/platforms model) |

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Stripe keys
npm run dev
```

### Local multi-tenant routing

Subdomains resolve to `127.0.0.1` via **lvh.me** (no hosts-file edits):

- Apex / marketing → http://lvh.me:3000
- Template preview → http://lvh.me:3000/preview
- A tenant site → http://demo.lvh.me:3000  (any subdomain renders the demo for now)
- Dashboard → http://lvh.me:3000/dashboard

`NEXT_PUBLIC_ROOT_DOMAIN` controls the apex (defaults to `lvh.me:3000`; set to
`simvites.co.uk` in production).

## Project layout

```
app/
  layout.tsx            Root layout — fonts, theme bootstrap, globals
  page.tsx              Apex marketing landing
  preview/              Template #1 demo (no DB needed)
  s/[site]/             Tenant site route (middleware rewrites here)
  dashboard/            Authenticated app shell (placeholder)
components/
  theme/                ThemeProvider + no-flash script + toggle
  template-one/         Template #1 blocks (hero, events, schedule, …)
lib/
  types.ts              Domain types (mirror the SQL schema)
  tenant.ts             Subdomain ↔ site resolution
  sites.ts              resolveSiteBySlug (Supabase-backed later)
  supabase/             Browser + server + admin clients
templates/
  template-one.ts       "Editorial Luxe" template-as-data + demo site
proxy.ts                Multi-tenant edge routing (Next 16 proxy convention)
supabase/
  migrations/0001_init.sql   Full schema + RLS
```

## Database

See [`supabase/README.md`](supabase/README.md) to apply the schema.

## Roadmap (MVP, ruthless)

1. ✅ Scaffold · data model · multi-tenant routing · light/dark theming · Template #1
2. Supabase Auth + dashboard + site list
3. Puck editor wired to `pages.content_json`
4. RSVP / guest engine on Supabase (per-event caps, disappearing events, history)
5. Invite delivery (Resend email) + personalised tokens
6. Publish → subdomain (draft/publish snapshots)
7. Stripe billing

Deferred: custom domains, more templates, seating/galleries polish, WhatsApp, AI.
