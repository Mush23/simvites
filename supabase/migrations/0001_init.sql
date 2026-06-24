-- ─────────────────────────────────────────────────────────────────────────
-- Simvites · initial schema (multi-tenant event-website builder)
-- Postgres / Supabase. Mirrors the architecture brief, Section 5.
--
-- Conventions:
--   • Every table: id uuid pk, created_at, updated_at.
--   • Tenant isolation by org_id, enforced with Row-Level Security (RLS).
--   • Child rows DENORMALISE org_id (and site_id where useful) so every RLS
--     policy is a single indexed check — no recursive joins. This is the
--     recommended Supabase multi-tenant pattern.
--   • Guests are NOT auth users. Public/guest reads of a PUBLISHED site go
--     through trusted server code (service role) that validates the opaque
--     invitation token. RLS below therefore locks the authoring side to org
--     members; it deliberately does not open broad anonymous read access.
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ── Shared helpers ────────────────────────────────────────────────────────

-- Keep updated_at fresh on every UPDATE.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Enums ─────────────────────────────────────────────────────────────────
create type org_role        as enum ('owner', 'collaborator');
create type site_status      as enum ('draft', 'published');
create type theme_mode       as enum ('light', 'dark', 'system');
create type event_site_type  as enum ('wedding', 'engagement', 'reception', 'party', 'corporate', 'other');
create type invite_channel    as enum ('email', 'whatsapp', 'sms');
create type send_status        as enum ('queued', 'sent', 'delivered', 'bounced', 'failed', 'opened');
create type rsvp_status         as enum ('active', 'superseded');
create type domain_type         as enum ('subdomain', 'custom');
create type ssl_status           as enum ('pending', 'provisioning', 'active', 'error');
create type subscription_status  as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

-- ════════════════════════════════════════════════════════════════════════
-- IDENTITY & ACCOUNTS
-- ════════════════════════════════════════════════════════════════════════

-- Mirror of auth.users we can FK against and store app profile fields on.
create table public.users (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  name          text,
  auth_provider text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.organizations (
  id                 uuid primary key default gen_random_uuid(),
  owner_user_id      uuid not null references public.users (id) on delete restrict,
  name               text not null,
  stripe_customer_id text unique,
  plan               text not null default 'free',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.memberships (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  role       org_role not null default 'collaborator',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index on public.memberships (user_id);
create index on public.memberships (org_id);

-- Membership check used by every tenant RLS policy. SECURITY DEFINER so the
-- function can read memberships regardless of the caller's own RLS.
create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_owner(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = target_org and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- ════════════════════════════════════════════════════════════════════════
-- TEMPLATES (global gallery — data, not code)
-- ════════════════════════════════════════════════════════════════════════
create table public.templates (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               text not null,
  event_type         event_site_type not null default 'wedding',
  preview_image      text,
  content_json       jsonb not null default '{}'::jsonb,   -- starter Puck page content
  default_theme_json jsonb not null default '{}'::jsonb,   -- starter theme tokens
  default_events_json jsonb not null default '[]'::jsonb,  -- starter event structure
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════
-- SITES (one event site per row)
-- ════════════════════════════════════════════════════════════════════════
create table public.sites (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references public.organizations (id) on delete cascade,
  template_id          uuid references public.templates (id),
  event_type           event_site_type not null default 'wedding',
  name                 text not null,
  slug                 text not null unique,            -- subdomain label
  status               site_status not null default 'draft',
  published_version_id uuid,                            -- FK added after site_versions exists
  timezone             text not null default 'Europe/London',
  rsvp_deadline        date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index on public.sites (org_id);

create table public.site_versions (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  site_id       uuid not null references public.sites (id) on delete cascade,
  snapshot_json jsonb not null,                        -- immutable published snapshot
  published_at  timestamptz not null default now(),
  published_by  uuid references public.users (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.site_versions (site_id);

alter table public.sites
  add constraint sites_published_version_fk
  foreign key (published_version_id) references public.site_versions (id) on delete set null;

create table public.themes (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations (id) on delete cascade,
  site_id           uuid not null references public.sites (id) on delete cascade,
  font_heading      text not null default 'Cormorant Garamond',
  font_body         text not null default 'Jost',
  color_tokens_jsonb jsonb not null default '{}'::jsonb, -- { light: {...}, dark: {...} } OKLCH
  mode_default      theme_mode not null default 'system',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (site_id)
);

create table public.pages (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  site_id      uuid not null references public.sites (id) on delete cascade,
  path         text not null default '/',
  title        text,
  content_json jsonb not null default '{}'::jsonb,      -- Puck page data
  "order"      int not null default 0,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (site_id, path)
);
create index on public.pages (site_id);

-- ════════════════════════════════════════════════════════════════════════
-- EVENTS (the multi-event list — Sangeet / Vidhi / Wedding / Reception …)
-- ════════════════════════════════════════════════════════════════════════
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  site_id     uuid not null references public.sites (id) on delete cascade,
  key         text not null,                            -- stable key (sangeet, vidhi, …)
  name        text not null,
  tagline     text,
  event_date  date,
  start_time  time,
  duration_hours numeric,
  venue       text,
  address     text,
  theme_label text,                                     -- e.g. "Navy · Gold"
  palette     jsonb not null default '[]'::jsonb,       -- OKLCH swatches
  accent_token text,                                    -- e.g. "ev-sangeet"
  cover_image text,
  schedule_json jsonb not null default '[]'::jsonb,     -- [{time,label}]
  "order"     int not null default 0,
  visible     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (site_id, key)
);
create index on public.events (site_id);

-- ════════════════════════════════════════════════════════════════════════
-- GUEST LIST & RSVP ENGINE (the ported USP)
-- ════════════════════════════════════════════════════════════════════════
create table public.households (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  site_id    uuid not null references public.sites (id) on delete cascade,
  name       text not null,
  code       text not null,                             -- short human code
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, code)
);
create index on public.households (site_id);

create table public.guests (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  site_id      uuid not null references public.sites (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  name         text not null,
  is_child     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.guests (household_id);

-- Per-household, per-event invite + capacity. cap = 0 ⇒ event hidden for them.
create table public.guest_event_invites (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  site_id      uuid not null references public.sites (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  event_id     uuid not null references public.events (id) on delete cascade,
  cap          int not null default 0 check (cap >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (household_id, event_id)
);
create index on public.guest_event_invites (event_id);

create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  site_id      uuid not null references public.sites (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  token        text not null unique,                    -- opaque, not guessable
  url          text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (household_id)
);
create index on public.invitations (token);

create table public.invite_sends (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  site_id       uuid not null references public.sites (id) on delete cascade,
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  channel       invite_channel not null,
  status        send_status not null default 'queued',
  sent_at       timestamptz,
  opened_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.invite_sends (invitation_id);

-- Non-destructive RSVP history: a new submission supersedes the prior active one.
create table public.rsvps (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  site_id      uuid not null references public.sites (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  status       rsvp_status not null default 'active',
  submitted_by text,
  dietary      text,
  message      text,
  submitted_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.rsvps (household_id);
-- At most one active RSVP per household.
create unique index rsvps_one_active_per_household
  on public.rsvps (household_id) where (status = 'active');

create table public.rsvp_event_responses (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  site_id    uuid not null references public.sites (id) on delete cascade,
  rsvp_id    uuid not null references public.rsvps (id) on delete cascade,
  guest_id   uuid not null references public.guests (id) on delete cascade,
  event_id   uuid not null references public.events (id) on delete cascade,
  attending  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rsvp_id, guest_id, event_id)
);
create index on public.rsvp_event_responses (rsvp_id);

-- ════════════════════════════════════════════════════════════════════════
-- LIVE POST-PUBLISH FEATURES: seating, galleries, updates feed
-- ════════════════════════════════════════════════════════════════════════
create table public.seating_charts (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  site_id    uuid not null references public.sites (id) on delete cascade,
  name       text not null,
  published  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tables (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations (id) on delete cascade,
  site_id          uuid not null references public.sites (id) on delete cascade,
  seating_chart_id uuid not null references public.seating_charts (id) on delete cascade,
  label            text not null,
  capacity         int not null default 0 check (capacity >= 0),
  x                numeric,
  y                numeric,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.tables (seating_chart_id);

create table public.seat_assignments (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  site_id    uuid not null references public.sites (id) on delete cascade,
  table_id   uuid not null references public.tables (id) on delete cascade,
  guest_id   uuid not null references public.guests (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guest_id)                                     -- a guest sits at one table
);
create index on public.seat_assignments (table_id);

create table public.galleries (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  site_id    uuid not null references public.sites (id) on delete cascade,
  name       text not null,
  published  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.photos (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  site_id      uuid not null references public.sites (id) on delete cascade,
  gallery_id   uuid not null references public.galleries (id) on delete cascade,
  storage_path text not null,                           -- Supabase Storage object path
  caption      text,
  "order"      int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.photos (gallery_id);

create table public.updates_feed (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  site_id      uuid not null references public.sites (id) on delete cascade,
  title        text not null,
  body         text,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.updates_feed (site_id);

-- ════════════════════════════════════════════════════════════════════════
-- DOMAINS, BILLING, ANALYTICS
-- ════════════════════════════════════════════════════════════════════════
create table public.domains (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  site_id    uuid not null references public.sites (id) on delete cascade,
  type       domain_type not null default 'subdomain',
  hostname   text not null unique,
  verified   boolean not null default false,
  ssl_status ssl_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid not null references public.organizations (id) on delete cascade,
  stripe_subscription_id text unique,
  product                text,
  status                 subscription_status not null default 'incomplete',
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index on public.subscriptions (org_id);

create table public.tracking_events (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  site_id       uuid not null references public.sites (id) on delete cascade,
  household_id  uuid references public.households (id) on delete set null,
  type          text not null,                          -- invite_opened | rsvp_viewed | rsvp_submitted | page_viewed
  metadata_jsonb jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.tracking_events (site_id, type);

-- ── updated_at triggers (all tables) ──────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'users','organizations','memberships','templates','sites','site_versions',
    'themes','pages','events','households','guests','guest_event_invites',
    'invitations','invite_sends','rsvps','rsvp_event_responses','seating_charts',
    'tables','seat_assignments','galleries','photos','updates_feed','domains',
    'subscriptions','tracking_events'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY
--   • Tenant tables: full access for org members (is_org_member(org_id)).
--   • users: a row is readable/writable by that user.
--   • organizations/memberships: scoped by membership.
--   • templates: readable by any authenticated user; writes via service role.
-- ════════════════════════════════════════════════════════════════════════

-- Enable RLS everywhere.
do $$
declare t text;
begin
  foreach t in array array[
    'users','organizations','memberships','templates','sites','site_versions',
    'themes','pages','events','households','guests','guest_event_invites',
    'invitations','invite_sends','rsvps','rsvp_event_responses','seating_charts',
    'tables','seat_assignments','galleries','photos','updates_feed','domains',
    'subscriptions','tracking_events'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- users: self-access.
create policy users_self_select on public.users
  for select using (id = auth.uid());
create policy users_self_update on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- organizations: members can read; only owners can update; any auth user can
-- create an org (they become owner via app logic).
create policy orgs_member_select on public.organizations
  for select using (public.is_org_member(id));
create policy orgs_insert on public.organizations
  for insert with check (owner_user_id = auth.uid());
create policy orgs_owner_update on public.organizations
  for update using (public.is_org_owner(id)) with check (public.is_org_owner(id));
create policy orgs_owner_delete on public.organizations
  for delete using (public.is_org_owner(id));

-- memberships: members of the org can read; owners manage; a user may read
-- their own membership rows (needed to bootstrap is_org_member).
create policy memberships_self_select on public.memberships
  for select using (user_id = auth.uid() or public.is_org_member(org_id));
create policy memberships_owner_write on public.memberships
  for all using (public.is_org_owner(org_id)) with check (public.is_org_owner(org_id));

-- templates: global read for authenticated users.
create policy templates_read on public.templates
  for select using (auth.role() = 'authenticated');

-- Generic org-scoped policy for every tenant table that carries org_id.
do $$
declare t text;
begin
  foreach t in array array[
    'sites','site_versions','themes','pages','events','households','guests',
    'guest_event_invites','invitations','invite_sends','rsvps',
    'rsvp_event_responses','seating_charts','tables','seat_assignments',
    'galleries','photos','updates_feed','domains','subscriptions','tracking_events'
  ]
  loop
    execute format(
      'create policy %1$s_org_all on public.%1$I
         for all using (public.is_org_member(org_id))
         with check (public.is_org_member(org_id));', t);
  end loop;
end $$;

-- ── Bootstrap: when a new auth user appears, mirror into public.users ──────
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, auth_provider)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'name',
    new.raw_app_meta_data ->> 'provider'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
