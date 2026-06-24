# Supabase — database

## Schema

[`migrations/0001_init.sql`](migrations/0001_init.sql) is the full schema:
accounts/orgs/memberships, sites + immutable publish snapshots, themes, pages
(Puck JSON), the multi-event list, the per-event RSVP engine, invite delivery
log, seating, galleries, updates feed, domains, billing and analytics.

**Tenant isolation** is enforced with Postgres Row-Level Security: every tenant
row carries `org_id`, and policies allow access only to members of that org via
`is_org_member()`. Templates are globally readable to authenticated users.
Public guest reads of a published site go through trusted server code (service
role) that validates the opaque invitation token — RLS deliberately does not
open broad anonymous access.

## Applying it

### Option A — Supabase CLI (recommended)

```bash
npm i -g supabase            # or: npx supabase ...
supabase login
supabase link --project-ref <your-project-ref>
supabase db push             # applies everything in migrations/
```

### Option B — SQL editor

Paste the contents of `migrations/0001_init.sql` into the Supabase dashboard
SQL editor and run it.

## After applying

Generate fresh TypeScript types to replace the hand-written `lib/types.ts`
domain layer if you want DB-accurate row types:

```bash
supabase gen types typescript --project-id <ref> > lib/database.types.ts
```

## Seeding Template #1

The "Editorial Luxe" template lives as data in
[`../templates/template-one.ts`](../templates/template-one.ts). A future seed
script inserts it into the `templates` table; "Use template" then clones its
content + theme + events into a new site.
