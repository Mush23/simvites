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

## Roadmap (build order — brief §10)

Schema is built fully now (migrations-later is painful); UI/logic ships in phases.

- **Phase 0 — foundation** ✅ Next.js, Tailwind v4, Supabase clients, migrations + RLS, theming, multi-tenant proxy, Template #1
- **Phase 1 — site creation:** Supabase Auth, org bootstrap, create-site-from-template, dashboard, settings, theme + events CRUD
- **Phase 2 — editor + publishing:** Puck (block library), draft pages, publish RPC, public renderer from `site_versions` only
- **Phase 3 — guests + RSVP:** households/guests CRUD, two-level invite matrices, public RSVP flow + RSVP RPC (caps/deadline/supersede)
- **Phase 4 — invite sending:** hashed token gen, `/i/:token` → HttpOnly guest cookie → clean URL, Resend batches, idempotent webhooks
- **Phase 5 — payment unlock:** Stripe one-time checkout, idempotent webhooks, `purchases`, unlock paid features

**Security non-negotiables (already in the schema):** `org_id` + RLS on every
tenant table; invitation tokens stored **hashed** (`token_hash`, never raw, no
`?g=`); public renderer reads **only** published `site_versions` snapshots;
RSVP submission via a transactional RPC; idempotent Stripe **and** email webhooks.

Deferred (designed to add cleanly): custom domains, WhatsApp/SMS, seating
drag-and-drop, full galleries, guest uploads, AI guest-list parsing, more
templates, corporate flows, subscriptions, advanced analytics, guest accounts.
