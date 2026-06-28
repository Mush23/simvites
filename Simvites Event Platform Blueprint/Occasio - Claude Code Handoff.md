# Occasio — Claude Code Build Handoff (Phase 1)

> **What this is.** The technical spec that turns the Occasio blueprint + prototype into something Claude Code can build without guessing. Pair it with `Occasio Blueprint.dc.html` (strategy + UX) and `Occasio Prototype.dc.html` (visual reference + design tokens for the 5 hero screens).
>
> **Working name:** "Occasio" is a placeholder — not legally cleared. Keep the brand string in **one config constant** (`BRAND_NAME`) so a rename is a one-line change.
>
> **Golden rules (do not violate):**
> 1. Guests are **not** users. No guest accounts, ever. Access is via a hashed secure token only.
> 2. The public site renders from a **published snapshot**, never from live draft tables.
> 3. **RSVP caps and invite visibility are enforced server-side**, never trusted from the client.
> 4. RLS + tenant isolation by `org_id` is non-negotiable on every tenant table.
> 5. Schema uses **broad nouns** (`site`, `event`, `guest`, `household`, `response`) — no "wedding" in column names. The wedding vocabulary lives only in the UI copy layer.

---

## 1. Stack & services

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | Server Components for reads, Server Actions / Route Handlers for writes |
| Hosting | Vercel | Preview deploys per PR |
| DB | Supabase Postgres | Single project; RLS on |
| Auth | Supabase Auth | Hosts/collaborators only. Email magic-link + password |
| Storage | Supabase Storage | Buckets: `site-assets` (public-read, published), `files` (private, signed URLs) |
| Email | Resend | Transactional only in Phase 1 (invites, confirmations, reminders) |
| Payments | Stripe | One-time Checkout to unlock publish/send. Not subscriptions in Phase 1 |
| Jobs | Inngest | Batch invite sends, reminder schedules, bounce handling |
| Analytics | PostHog | Funnel: signup → site created → published → invites sent → RSVPs |
| Styling | Tailwind v4 + OKLCH tokens | Tokens copied from the prototype `:root` blocks (light + dark) |
| Editor | Puck (open-source) | Locked block library — **no freeform canvas** |

### Environment variables (create `.env.local`, set the same in Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only — guest token validation, snapshot publish, RSVP RPC
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
TOKEN_PEPPER=                     # server-only secret added before hashing guest tokens
NEXT_PUBLIC_BASE_DOMAIN=occasio.events
```

### Pre-flight checklist (do before writing app code)
- [ ] Supabase project created; service-role key stored server-only (never `NEXT_PUBLIC_`).
- [ ] Storage buckets `site-assets` (public) and `files` (private) created with policies (see §6).
- [ ] Resend domain verified; SPF/DKIM set.
- [ ] Stripe test mode; one Product ("Command Centre unlock") + price.
- [ ] Wildcard subdomain `*.occasio.events` pointed at Vercel for published sites.

---

## 2. Naming & conventions
- Tables: snake_case, plural. Timestamps: `created_at`, `updated_at` (UTC `timestamptz`).
- **Money is stored as integer minor units (pence).** Never floats. Currency is `GBP` for Phase 1 (column present for later).
- Every tenant row carries `site_id` (and is reachable to `org_id` via `sites`). Filter/secure on it always.
- Soft-delete with `archived_at` on `events`, `guests`, `households`, `vendors`, `budget_items`, `tasks` (hosts make mistakes; never hard-delete guest data mid-event).
- `status`/`visibility`/`role` fields use Postgres `enum`s (below) — not free strings.

---

## 3. Data model — Postgres DDL

> Implement in this order (FK dependencies). This is the **build-fully** core for Phase 1. Tables marked _stub_ get created now (so the model is complete) but minimal UI.

```sql
-- ===== Enums =====
create type member_role     as enum ('owner','collaborator','viewer');
create type site_status      as enum ('draft','published');
create type event_visibility as enum ('public','invite_only','hidden');
create type rsvp_status       as enum ('pending','attending','declined');
create type vendor_status     as enum ('shortlisted','contacted','quote_in','booked','declined');
create type budget_status     as enum ('estimated','deposit_paid','part_paid','paid');
create type task_status       as enum ('todo','in_progress','done');
create type task_priority     as enum ('low','normal','high');

-- ===== Tenancy =====
create table organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (                       -- 1:1 with auth.users
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table memberships (
  org_id uuid not null references organisations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role member_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- ===== Site & content =====
create table sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  slug text unique not null,                  -- subdomain: <slug>.occasio.events
  title text not null,
  labels jsonb not null default '{}',         -- UI relabels: couple/guest/event/rsvp...
  theme jsonb not null default '{}',          -- accent, font, mode
  status site_status not null default 'draft',
  currency text not null default 'GBP',
  is_unlocked boolean not null default false, -- set true after Stripe payment
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table pages (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  slug text not null,
  title text not null,
  nav_order int not null default 0,
  is_home boolean not null default false,
  hidden boolean not null default false,
  puck_data jsonb not null default '{}',      -- Puck document for this page
  unique (site_id, slug)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,                         -- host-named: "Sangeet", "Nikah"...
  preset_key text,                            -- taxonomy key (optional)
  starts_at timestamptz,
  ends_at timestamptz,
  venue_name text,
  address text,
  description text,
  dress_code text,
  meal_notes text,
  host_side text,
  rsvp_required boolean not null default true,
  capacity int,                              -- null = uncapped
  visibility event_visibility not null default 'invite_only',
  accent text,
  sort_order int not null default 0,
  on_website boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== Guests =====
create table households (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,                         -- "The Shah Family"
  side text,                                  -- bride/groom/partner-A... free text
  note text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table guests (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  is_child boolean not null default false,
  is_plus_one boolean not null default false,
  dietary text,
  note text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

-- The invitation matrix: one row = "this guest is invited to this event"
create table invitations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (guest_id, event_id)
);

-- Secure household access. Store ONLY the hash. Raw token lives only in the link.
create table guest_access_tokens (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  token_hash text not null unique,            -- sha256(pepper + raw)
  expires_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

-- One response per guest per event
create table responses (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  status rsvp_status not null default 'pending',
  message text,                               -- message to hosts (per submission)
  custom jsonb not null default '{}',         -- answers to custom questions
  responded_at timestamptz,
  responded_by text,                          -- 'guest' | 'host' (manual entry)
  unique (guest_id, event_id)
);

-- ===== Vendors & money =====
create table vendors (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  category text not null,
  contact_name text, email text, phone text, website text, instagram text,
  status vendor_status not null default 'shortlisted',
  quote_amount int,                           -- pence
  contracted_amount int,                      -- pence
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table vendor_events (                  -- a vendor covers many events
  vendor_id uuid not null references vendors(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  primary key (vendor_id, event_id)
);

create table budget_items (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  vendor_id uuid references vendors(id) on delete set null,
  category text not null,
  label text not null,
  estimated_amount int not null default 0,    -- pence
  actual_amount int,                          -- pence
  paid_amount int not null default 0,         -- pence
  due_date date,
  status budget_status not null default 'estimated',
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table payments (                       -- optional granular ledger
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  budget_item_id uuid not null references budget_items(id) on delete cascade,
  amount int not null,                        -- pence
  paid_on date not null default current_date,
  method text, note text
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  vendor_id uuid references vendors(id) on delete set null,
  budget_item_id uuid references budget_items(id) on delete set null,
  title text not null,
  owner_id uuid references profiles(id) on delete set null,
  due_date date,
  status task_status not null default 'todo',
  priority task_priority not null default 'normal',
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table files (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  storage_path text not null,                 -- in private 'files' bucket
  name text not null,
  kind text,                                  -- contract|quote|invoice|menu|floorplan|image|other
  event_id uuid references events(id) on delete set null,
  vendor_id uuid references vendors(id) on delete set null,
  budget_item_id uuid references budget_items(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ===== Publish & audit =====
create table published_versions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  snapshot jsonb not null,                    -- fully-rendered site + visible events
  summary text,                               -- "what changed"
  published_by uuid references profiles(id) on delete set null,
  published_at timestamptz not null default now()
);

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  verb text not null,                         -- 'created'|'updated'|'published'|'sent_invites'...
  entity_type text not null,
  entity_id uuid,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index on events(site_id, sort_order);
create index on guests(site_id, household_id);
create index on invitations(site_id, event_id);
create index on responses(site_id, event_id, status);
create index on budget_items(site_id, event_id);
create index on tasks(site_id, status, due_date);
create index on vendor_events(event_id);
```

---

## 4. RLS — pattern + critical policies

Enable RLS on **every** table above. Hosts/collaborators reach rows through `sites → org → memberships`. Guests never touch these tables directly (see §5).

```sql
-- Membership helper (SECURITY DEFINER avoids recursive RLS)
create or replace function is_org_member(target_org uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from memberships m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

-- Site-scoped helper used by all child tables
create or replace function can_access_site(target_site uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from sites s
    join memberships m on m.org_id = s.org_id
    where s.id = target_site and m.user_id = auth.uid()
  );
$$;

alter table sites enable row level security;
create policy site_rw on sites
  using (is_org_member(org_id)) with check (is_org_member(org_id));

-- Apply this same shape to EVERY child table (events, households, guests,
-- invitations, responses, vendors, vendor_events, budget_items, payments,
-- tasks, files, pages, published_versions, activity_log, guest_access_tokens):
alter table events enable row level security;
create policy events_rw on events
  using (can_access_site(site_id)) with check (can_access_site(site_id));
-- …repeat per table (vendor_events: derive site via its vendor/event)…

-- Writers can be further gated by role (viewer = read-only):
create or replace function can_write_site(target_site uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from sites s join memberships m on m.org_id = s.org_id
    where s.id = target_site and m.user_id = auth.uid()
      and m.role in ('owner','collaborator')
  );
$$;
-- then: with check (can_write_site(site_id)) on insert/update/delete policies.
```

**Public published read:** expose published sites via a server route using the **service role** that reads only `published_versions` (latest per site) — do **not** open draft tables to anon. Optionally a narrow anon `select` policy on `published_versions` filtered to the latest row if you prefer edge reads.

---

## 5. Guest identity & token security (the part most people get wrong)

- A host generates a link per **household**: `https://<slug>.occasio.events/i/<raw_token>`.
- Generate `raw_token` = 32 random bytes, base64url. Store **only** `sha256(TOKEN_PEPPER + raw_token)` in `guest_access_tokens.token_hash`. The raw token exists solely in the emailed link.
- Guest flow runs through **server routes using the service role**, never the anon client:
  1. `GET /i/[token]` → server hashes the token, looks up the household, checks `revoked`/`expires_at`.
  2. Server loads the household's guests and the events they're invited to via `invitations`. **Uninvited events are never serialised to the client** — visibility is enforced here, not in CSS.
  3. Guest submits via `POST` calling the `submit_response` RPC (below). No guest JWT, a short signed session cookie scoped to that household is fine.
- States to handle: valid, expired, revoked, not-found, deadline-passed (read-only), already-submitted (editable until deadline).

```sql
-- Server-side RSVP write with cap + invite enforcement (SECURITY DEFINER).
-- Called only from a server route after token validation.
create or replace function submit_response(
  p_guest uuid, p_event uuid, p_status rsvp_status,
  p_message text default null, p_custom jsonb default '{}'
) returns void language plpgsql security definer as $$
declare v_site uuid; v_cap int; v_count int;
begin
  -- must actually be invited
  if not exists (select 1 from invitations where guest_id=p_guest and event_id=p_event) then
    raise exception 'not invited';
  end if;
  select site_id, capacity into v_site, v_cap from events where id=p_event;
  -- enforce cap on attending
  if p_status='attending' and v_cap is not null then
    select count(*) into v_count from responses
      where event_id=p_event and status='attending' and guest_id<>p_guest;
    if v_count >= v_cap then raise exception 'event full'; end if;
  end if;
  insert into responses(site_id,guest_id,event_id,status,message,custom,responded_at,responded_by)
  values (v_site,p_guest,p_event,p_status,p_message,p_custom,now(),'guest')
  on conflict (guest_id,event_id)
  do update set status=excluded.status, message=excluded.message,
                custom=excluded.custom, responded_at=now(), responded_by='guest';
end; $$;
```

**Storage policies:** `files` bucket is private → serve via short-lived signed URLs from a server route that first checks `can_access_site`. `site-assets` (couple photos, etc.) is public-read but write-gated to members.

---

## 6. Connected-object logic ("Enter once. Reuse everywhere.")

This is the product. Implement reads as **joins/views**, never copies.

- **Event** drives: website schedule blocks, RSVP setup, invite matrix columns, `vendor_events`, `budget_items.event_id`, `tasks.event_id`, exports.
- **Guest** drives: invite links, RSVP form, dietary list, attendance counts, caterer export, reminder segments.
- **Vendor** drives: pipeline, `vendor_events` coverage, linked `budget_items`, linked `tasks`, linked `files`.
- **Budget item** links `event_id` + `vendor_id`; dashboard "budget health" is a sum view.

**"This will update…" confirmations** are UI, computed from the graph before a write. On editing an event's `starts_at`, show: _"Updates schedule, RSVP page, website draft, exports. Publish to show guests."_ Maintain a small map `entity → dependent surfaces` and render it in the confirm dialog. Changing data does **not** auto-publish — publishing is explicit (§7).

**Dashboard readiness score** = weighted checklist computed server-side (events have venue+time, guests invited, invites sent, vendors booked, tasks not overdue, budget within total). Keep the weights in one module so it's tunable.

---

## 7. Publish / versioning

- Editing writes to draft tables only. **Publish** = serialise the site (pages' `puck_data` + visible events + theme + labels) into `published_versions.snapshot` and flip `sites.status='published'`.
- Public renderer reads the **latest snapshot only**. Never query draft tables on the public path.
- Publish modal shows a diff summary vs the previous snapshot ("what changed") and an optional "notify guests" toggle (Phase 1: triggers an Inngest job that emails an update; rollback is Phase 2 — snapshots make it trivial later).
- Gate publish + invite-send behind `sites.is_unlocked` (Stripe). Free tier = draft + preview only.

---

## 8. Import / export

**Import (guests/vendors/budget):** paste or CSV → auto-detect columns → map fields → duplicate detection (match on name+email for guests) → preview → confirm → "create missing households/events?" → summary. Never silently overwrite; show a per-row before/after. Build as a client wizard posting a validated batch to a server action.

**Export (CSV, one click each):** guest list, household list, RSVP by event, dietary list, event attendance, vendor list, budget, tasks. These are `select` queries flattened to CSV — cheap, build them all in Phase 1D; they're a top reason hosts trust the tool.

---

## 9. Route map (Next.js App Router)

```
/                                   marketing home
/pricing /templates /weddings /celebrations /contact
/login /signup
/(app)/dashboard                    Command Centre
/(app)/website                      Puck editor shell
/(app)/events            /events/[eventId]      Event Hub (tabs: overview/guests/rsvp/vendors/budget/tasks/files)
/(app)/guests                       households + invite matrix
/(app)/invitations                  batch send + delivery
/(app)/rsvps                        host RSVP dashboard
/(app)/budget                       budget views
/(app)/vendors           /vendors/[vendorId]    vendor detail (linked)
/(app)/tasks  /(app)/files  /(app)/reports  /(app)/settings
/(app)/settings/billing             Stripe

# Public (no app chrome, subdomain or path-routed in dev)
/s/[siteSlug]                       published site home  (snapshot only)
/s/[siteSlug]/[pageSlug]
/i/[token]                          guest entry → welcome → RSVP → confirmation
/api/inngest  /api/stripe/webhook  /api/files/[id]/signed-url
```

---

## 10. Component map (priority order)
1. App shell + sidebar (12 modules) + topbar + theme toggle
2. Stat / readiness card (+ ring)
3. Event card + **Event Hub tab bar**
4. **Invite-matrix cell** (toggle, optimistic, server-confirmed)
5. Vendor row + status pill
6. Budget line row (estimate/paid/balance)
7. Task row (checkbox, due, priority)
8. File chip (linked entity)
9. **Quick-add drawer** (shared add-UX for guest/vendor/budget/task)
10. **"This will update…" confirm dialog**
11. Public site blocks (Puck): Hero, Schedule, Event detail, RSVP CTA, Travel, FAQ, Footer — image areas use **`<image-slot>`-style** uploaders (drag, reframe). _Note: the prototype demonstrates real drag-drop image slots on the public site._
12. Guest RSVP flow (welcome → per-event → details → review → confirmation)

---

## 11. Phase plan & Definition of Done

> Ship **1A→1C as a usable product to 2–3 design partners first**, then build 1D once they confirm they'd pay. Even the "minimum competitive platform" is many weeks of AI-assisted work for a solo founder — the checkpoint after 1C de-risks the rest.

**1A — Foundation.** _DoD:_ a signed-in owner can create an org + site; schema + RLS deployed; app shell renders; tokens wired; seed/demo data script loads "Aanya & Dev". No real features yet, but tenancy is provably isolated (two orgs can't see each other's rows — write a test).

**1B — Website + Events.** _DoD:_ host can CRUD events; build a page in Puck from the locked block library; events render on the public site reading **published snapshot**; draft≠public proven (edit, see it not change publicly until publish); subdomain serves; light/dark.

**1C — Guests + RSVP + Invitations.** _DoD:_ households/guests CRUD + paste import; invite matrix toggles `invitations`; per-household token link; Resend invite + test send; guest opens link, sees **only invited events**, submits via `submit_response` (cap + invite enforced); confirmation; host RSVP dashboard; CSV exports. This is the first genuinely sellable cut.

**1D — Planning modules.** _DoD:_ Budget (by event/category, estimate/paid/due, linked vendor, export); Vendors (pipeline, quote/contract/paid/balance, `vendor_events`, linked tasks/files); Tasks (per event, starter packs); Files (upload, link, signed-URL download); all reports. Connected reads verified (a vendor marked booked updates dashboard + tasks).

**1E — Launch polish.** _DoD:_ onboarding wizard; import flows for all entities; empty/loading/error states; responsive at 375px; dark mode pass; Stripe unlock gating publish+send; early-access landing live; PostHog funnel firing.

### Build-fully / stub / defer
- **Build fully:** everything in §3 core, the guest token + RSVP RPC, publish snapshot, CSV export, the 5 hero screens.
- **Stub (table exists, minimal UI):** `payments` (fold into budget item paid_amount first), `activity_log` (write events, simple list view).
- **Defer (do NOT build; architecture already supports):** WhatsApp/SMS, messaging threads, AI anything, seating canvas, supplier marketplace/portal, ticketing, corporate mode, granular per-module permissions, multi-currency/accounting, planner multi-client portal, custom domains (designed-for via `sites.slug` + a future `domains` table), mobile app, rollback UI.

---

## 12. First 10 Claude Code tasks (in order)
1. Scaffold Next.js (App Router) + Tailwind v4 + OKLCH tokens from the prototype; add `BRAND_NAME` config; wire Supabase client (anon + server service-role helpers).
2. Run the §3 DDL as a Supabase migration; add the §4 enums, helpers, and RLS policies on every table; write a 2-org isolation test.
3. Auth (magic-link + password), `profiles` upsert on signup, create-org/create-site flow, app shell + sidebar + theme toggle.
4. Events CRUD + Event Hub route with tabs (overview live; others read connected data).
5. Households + guests CRUD + paste import wizard; invite matrix writing `invitations` (optimistic + server confirm).
6. Guest token generation + `/i/[token]` server route (hash lookup, invited-events only) + RSVP flow + `submit_response` RPC + confirmation + states.
7. Vendors (incl. `vendor_events`) + Budget items linked to event/vendor + dashboard budget/vendor summaries.
8. Tasks + Files (upload to private bucket, signed-URL route, polymorphic links) + starter task packs.
9. CSV exports (all of §8) + the import flows for vendors/budget.
10. Puck website blocks + publish→snapshot + public snapshot renderer + Stripe unlock gating publish/send; image uploaders on the public template.

---

## 13. Open decisions to confirm before/while building
- **Brand name** (legal clearance) — keep as `BRAND_NAME` constant until decided.
- **Pricing** — free incumbents (Joy/Zola/The Knot do website+RSVP free) mean the paywall should sit on the **connected planning modules + concierge**, not the website. Validate willingness-to-pay with design partners before building all of 1D.
- **First template** — build the one "Aanya" neutral-luxe multi-event template; everything else is a later simplification of it.
```
