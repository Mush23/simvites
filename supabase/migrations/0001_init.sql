-- ─────────────────────────────────────────────────────────────────────────
-- Simvites · initial schema (multi-tenant event-website builder)
-- Postgres / Supabase.
--
-- Follows the architecture brief **Section 10 (ADOPTED amendments)**, which
-- overrides Sections 4–5 where they conflict. Build the schema fully now; UI
-- lands in phase order. Security-critical shapes (hashed tokens, RLS, RSVP
-- integrity, idempotent webhooks) are implemented here.
--
-- Conventions:
--   • Every table: id uuid pk, created_at, updated_at. Soft delete (deleted_at)
--     on the mutable core tables.
--   • Tenant isolation by org_id on EVERY tenant-owned table — never rely on
--     parent joins. RLS enabled on every exposed table; org policies scoped to
--     active membership via is_org_member().
--   • Platform tables with no org_id (provider_webhook_events, suppression_list)
--     enable RLS with NO permissive policy → reachable only by the service role.
--   • Guests are NOT auth users. Public guest access goes through trusted server
--     routes that validate a hashed invitation token and set an HttpOnly guest
--     cookie — never client-side Supabase access, never a raw ?g= token.
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ── Shared helper: keep updated_at fresh ──────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Enums ─────────────────────────────────────────────────────────────────
create type org_role            as enum ('owner', 'admin', 'collaborator');
create type site_status          as enum ('draft', 'published');
create type theme_mode           as enum ('light', 'dark', 'system');
create type event_site_type      as enum ('wedding', 'birthday', 'celebration', 'corporate', 'other');
create type message_channel      as enum ('email', 'whatsapp', 'sms');
create type batch_status         as enum ('draft', 'sending', 'sent', 'failed');
create type message_status       as enum ('queued', 'sent', 'delivered', 'opened', 'bounced', 'failed', 'suppressed');
create type rsvp_status          as enum ('active', 'superseded');
create type rsvp_question_type   as enum ('text', 'single_select', 'multi_select', 'boolean');
create type domain_type          as enum ('platform_subdomain', 'custom');
create type ssl_status           as enum ('pending', 'provisioning', 'active', 'error');
create type subscription_status  as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');
create type purchase_status      as enum ('pending', 'paid', 'refunded', 'failed');
create type actor_type           as enum ('user', 'guest', 'system');

-- ════════════════════════════════════════════════════════════════════════
-- IDENTITY & ACCOUNTS
-- ════════════════════════════════════════════════════════════════════════

-- App-level profile, 1:1 with auth.users.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  name        text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.organizations (
  id                 uuid primary key default gen_random_uuid(),
  owner_user_id      uuid not null references public.profiles (id) on delete restrict,
  name               text not null,
  stripe_customer_id text unique,
  plan               text not null default 'free',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

create table public.memberships (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       org_role not null default 'collaborator',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index on public.memberships (user_id);
create index on public.memberships (org_id);

-- Membership checks used by every tenant RLS policy. SECURITY DEFINER so the
-- function reads memberships regardless of the caller's own RLS.
create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(target_org uuid, roles org_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = target_org and m.user_id = auth.uid() and m.role = any (roles)
  );
$$;

create or replace function public.is_org_owner(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(target_org, array['owner']::org_role[]);
$$;

-- ════════════════════════════════════════════════════════════════════════
-- TEMPLATES (global gallery — data, not code)
-- ════════════════════════════════════════════════════════════════════════
create table public.templates (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  name                text not null,
  event_type          event_site_type not null default 'wedding',
  preview_image       text,
  content_json        jsonb not null default '{}'::jsonb,
  default_theme_json  jsonb not null default '{}'::jsonb,
  default_events_json jsonb not null default '[]'::jsonb,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════
-- SITES, VERSIONS, THEME, PAGES
-- ════════════════════════════════════════════════════════════════════════
create table public.sites (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references public.organizations (id) on delete cascade,
  template_id          uuid references public.templates (id),
  event_type           event_site_type not null default 'wedding',
  name                 text not null,
  slug                 text not null unique,        -- platform subdomain label
  status               site_status not null default 'draft',
  published_version_id uuid,                          -- FK added after site_versions
  timezone             text not null default 'Europe/London',
  rsvp_deadline        timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);
create index on public.sites (org_id);

-- Immutable published snapshots — the ONLY source the public renderer reads.
create table public.site_versions (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations (id) on delete cascade,
  site_id        uuid not null references public.sites (id) on delete cascade,
  schema_version int not null default 1,
  snapshot_json  jsonb not null,   -- pages, blocks, theme, events, rsvp settings, nav, seo, assets
  published_at   timestamptz not null default now(),
  published_by   uuid references public.profiles (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.site_versions (site_id);

alter table public.sites
  add constraint sites_published_version_fk
  foreign key (published_version_id) references public.site_versions (id) on delete set null;

-- Records each publish action (and whether guests were notified).
create table public.publish_events (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations (id) on delete cascade,
  site_id         uuid not null references public.sites (id) on delete cascade,
  site_version_id uuid not null references public.site_versions (id) on delete cascade,
  published_by    uuid references public.profiles (id),
  notify_guests   boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.publish_events (site_id);

create table public.themes (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations (id) on delete cascade,
  site_id            uuid not null references public.sites (id) on delete cascade,
  font_heading       text not null default 'Cormorant Garamond',
  font_body          text not null default 'Jost',
  color_tokens_jsonb jsonb not null default '{}'::jsonb,  -- { light: {...}, dark: {...} } OKLCH overrides
  mode_default       theme_mode not null default 'system',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (site_id)
);

create table public.pages (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  site_id      uuid not null references public.sites (id) on delete cascade,
  path         text not null default '/',
  title        text,
  content_json jsonb not null default '{}'::jsonb,        -- Puck page data
  "order"      int not null default 0,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  unique (site_id, path)
);
create index on public.pages (site_id);

-- ════════════════════════════════════════════════════════════════════════
-- EVENTS (the multi-event list)
-- ════════════════════════════════════════════════════════════════════════
create table public.events (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations (id) on delete cascade,
  site_id        uuid not null references public.sites (id) on delete cascade,
  key            text not null,
  name           text not null,
  tagline        text,
  event_date     date,
  start_time     time,
  duration_hours numeric,
  venue          text,
  address        text,
  theme_label    text,
  palette        jsonb not null default '[]'::jsonb,
  accent_token   text,
  cover_image    text,
  schedule_json  jsonb not null default '[]'::jsonb,
  "order"        int not null default 0,
  visible        boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  unique (site_id, key)
);
create index on public.events (site_id);

-- ════════════════════════════════════════════════════════════════════════
-- GUESTS & TWO-LEVEL INVITES
-- ════════════════════════════════════════════════════════════════════════
create table public.households (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  site_id    uuid not null references public.sites (id) on delete cascade,
  name       text not null,
  code       text not null,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
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
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index on public.guests (household_id);

-- Household-level invite: is this household invited to this event, is the event
-- visible to them, and the household capacity. cap 0 / invited false ⇒ hidden.
create table public.household_event_invites (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  site_id       uuid not null references public.sites (id) on delete cascade,
  household_id  uuid not null references public.households (id) on delete cascade,
  event_id      uuid not null references public.events (id) on delete cascade,
  invited       boolean not null default false,
  visible       boolean not null default false,
  household_cap int not null default 0 check (household_cap >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (household_id, event_id)
);
create index on public.household_event_invites (event_id);

-- Per-guest invite (MVP auto-creates from household settings; supports exceptions).
create table public.guest_event_invites (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  site_id    uuid not null references public.sites (id) on delete cascade,
  guest_id   uuid not null references public.guests (id) on delete cascade,
  event_id   uuid not null references public.events (id) on delete cascade,
  invited    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guest_id, event_id)
);
create index on public.guest_event_invites (event_id);

-- ════════════════════════════════════════════════════════════════════════
-- INVITATIONS (HASHED TOKENS — security non-negotiable)
--   Raw token is generated, sent once in the /i/<token> link, and never stored.
-- ════════════════════════════════════════════════════════════════════════
create table public.invitations (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations (id) on delete cascade,
  site_id          uuid not null references public.sites (id) on delete cascade,
  household_id     uuid not null references public.households (id) on delete cascade,
  token_hash       text not null unique,    -- sha-256 of the raw token
  token_prefix     text,                    -- short non-secret prefix for lookup/debug
  expires_at       timestamptz,
  revoked_at       timestamptz,
  last_accessed_at timestamptz,
  access_count     int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (household_id)
);
create index on public.invitations (token_hash);

-- ════════════════════════════════════════════════════════════════════════
-- RSVP ENGINE
-- ════════════════════════════════════════════════════════════════════════
create table public.rsvp_submissions (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations (id) on delete cascade,
  site_id         uuid not null references public.sites (id) on delete cascade,
  household_id    uuid not null references public.households (id) on delete cascade,
  status          rsvp_status not null default 'active',
  submitted_by    text,
  message         text,
  ip_hash         text,
  user_agent_hash text,
  submitted_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.rsvp_submissions (household_id);
-- At most one active submission per household.
create unique index rsvp_submissions_one_active_per_household
  on public.rsvp_submissions (household_id) where (status = 'active');

create table public.rsvp_event_responses (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organizations (id) on delete cascade,
  site_id             uuid not null references public.sites (id) on delete cascade,
  rsvp_submission_id  uuid not null references public.rsvp_submissions (id) on delete cascade,
  guest_id            uuid not null references public.guests (id) on delete cascade,
  event_id            uuid not null references public.events (id) on delete cascade,
  attending           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (rsvp_submission_id, guest_id, event_id)
);
create index on public.rsvp_event_responses (rsvp_submission_id);

-- Flexible Q&A (build tables now; MVP UI hardcodes 2–3 known questions).
create table public.rsvp_questions (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  site_id    uuid not null references public.sites (id) on delete cascade,
  key        text not null,                          -- dietary | meal | song | transport …
  label      text not null,
  type       rsvp_question_type not null default 'text',
  options    jsonb not null default '[]'::jsonb,
  required   boolean not null default false,
  "order"    int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, key)
);

create table public.rsvp_answers (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations (id) on delete cascade,
  site_id            uuid not null references public.sites (id) on delete cascade,
  rsvp_submission_id uuid not null references public.rsvp_submissions (id) on delete cascade,
  question_id        uuid not null references public.rsvp_questions (id) on delete cascade,
  guest_id           uuid references public.guests (id) on delete cascade,  -- null = household-level answer
  value              jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index on public.rsvp_answers (rsvp_submission_id);

-- ════════════════════════════════════════════════════════════════════════
-- MESSAGING / EMAIL DELIVERY
-- ════════════════════════════════════════════════════════════════════════
create table public.message_batches (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  site_id    uuid not null references public.sites (id) on delete cascade,
  channel    message_channel not null default 'email',
  subject    text,
  template   text,
  status     batch_status not null default 'draft',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.message_batches (site_id);

create table public.message_recipients (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organizations (id) on delete cascade,
  site_id             uuid not null references public.sites (id) on delete cascade,
  batch_id            uuid not null references public.message_batches (id) on delete cascade,
  invitation_id       uuid references public.invitations (id) on delete set null,
  household_id        uuid references public.households (id) on delete set null,
  to_address          text not null,
  channel             message_channel not null default 'email',
  status              message_status not null default 'queued',
  provider_message_id text,
  sent_at             timestamptz,
  delivered_at        timestamptz,
  opened_at           timestamptz,
  bounced_at          timestamptz,
  error               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on public.message_recipients (batch_id);
create index on public.message_recipients (provider_message_id);

-- Idempotent provider webhook log (Resend, Stripe). Platform-level: no org_id,
-- RLS enabled with no policy → service role only.
create table public.provider_webhook_events (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null,                  -- 'resend' | 'stripe'
  provider_event_id text not null,
  payload           jsonb not null default '{}'::jsonb,
  processed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (provider, provider_event_id)
);

-- Suppressed addresses (hard bounces / complaints / unsubscribes). Platform-level.
create table public.suppression_list (
  id         uuid primary key default gen_random_uuid(),
  address    text not null,
  channel    message_channel not null default 'email',
  reason     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (address, channel)
);

-- ════════════════════════════════════════════════════════════════════════
-- ASSETS (generic; galleries/photos reference this later)
-- ════════════════════════════════════════════════════════════════════════
create table public.assets (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  site_id    uuid references public.sites (id) on delete cascade,
  bucket     text not null,
  path       text not null,
  mime       text,
  size_bytes bigint,
  alt        text,
  usage_type text,                                   -- hero | gallery | cover | logo …
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.assets (site_id);

-- ════════════════════════════════════════════════════════════════════════
-- BILLING (one-time purchases are the first pricing model; subs kept for later)
-- ════════════════════════════════════════════════════════════════════════
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

create table public.purchases (
  id                         uuid primary key default gen_random_uuid(),
  org_id                     uuid not null references public.organizations (id) on delete cascade,
  site_id                    uuid references public.sites (id) on delete set null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id   text,
  product                    text,
  amount                     int,                    -- minor units
  currency                   text not null default 'gbp',
  status                     purchase_status not null default 'pending',
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);
create index on public.purchases (org_id);

-- ════════════════════════════════════════════════════════════════════════
-- DOMAINS, ANALYTICS, AUDIT
-- ════════════════════════════════════════════════════════════════════════
create table public.domains (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  site_id    uuid not null references public.sites (id) on delete cascade,
  type       domain_type not null default 'platform_subdomain',
  hostname   text not null unique,
  verified   boolean not null default false,
  ssl_status ssl_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tracking_events (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations (id) on delete cascade,
  site_id        uuid not null references public.sites (id) on delete cascade,
  household_id   uuid references public.households (id) on delete set null,
  type           text not null,                       -- invite_opened | rsvp_viewed | rsvp_submitted | page_viewed
  metadata_jsonb jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.tracking_events (site_id, type);

create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  actor_type   actor_type not null default 'user',
  actor_id     uuid,                                  -- profile id, guest id, or null (system)
  action       text not null,                         -- publish | rsvp_submit | invite_send | guest_import | payment …
  target_table text,
  target_id    uuid,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.audit_logs (org_id, created_at);

-- ════════════════════════════════════════════════════════════════════════
-- FUTURE FEATURES — schema planned now, no UI in MVP
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
  unique (guest_id)
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
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  site_id    uuid not null references public.sites (id) on delete cascade,
  gallery_id uuid not null references public.galleries (id) on delete cascade,
  asset_id   uuid references public.assets (id) on delete set null,
  caption    text,
  "order"    int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

-- ── updated_at triggers (all tables) ──────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','organizations','memberships','templates','sites','site_versions',
    'publish_events','themes','pages','events','households','guests',
    'household_event_invites','guest_event_invites','invitations',
    'rsvp_submissions','rsvp_event_responses','rsvp_questions','rsvp_answers',
    'message_batches','message_recipients','provider_webhook_events',
    'suppression_list','assets','subscriptions','purchases','domains',
    'tracking_events','audit_logs','seating_charts','tables','seat_assignments',
    'galleries','photos','updates_feed'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════

-- Enable RLS on every table.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','organizations','memberships','templates','sites','site_versions',
    'publish_events','themes','pages','events','households','guests',
    'household_event_invites','guest_event_invites','invitations',
    'rsvp_submissions','rsvp_event_responses','rsvp_questions','rsvp_answers',
    'message_batches','message_recipients','provider_webhook_events',
    'suppression_list','assets','subscriptions','purchases','domains',
    'tracking_events','audit_logs','seating_charts','tables','seat_assignments',
    'galleries','photos','updates_feed'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- profiles: self-access.
create policy profiles_self_select on public.profiles
  for select using (id = auth.uid());
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- organizations.
create policy orgs_member_select on public.organizations
  for select using (public.is_org_member(id));
create policy orgs_insert on public.organizations
  for insert with check (owner_user_id = auth.uid());
create policy orgs_owner_update on public.organizations
  for update using (public.is_org_owner(id)) with check (public.is_org_owner(id));
create policy orgs_owner_delete on public.organizations
  for delete using (public.is_org_owner(id));

-- memberships: read your own or your org's; owners/admins manage.
create policy memberships_select on public.memberships
  for select using (user_id = auth.uid() or public.is_org_member(org_id));
create policy memberships_manage on public.memberships
  for all
  using (public.has_org_role(org_id, array['owner','admin']::org_role[]))
  with check (public.has_org_role(org_id, array['owner','admin']::org_role[]));

-- templates: global read for authenticated users (writes via service role).
create policy templates_read on public.templates
  for select using (auth.role() = 'authenticated');

-- Generic org-scoped policy for every tenant table carrying org_id.
do $$
declare t text;
begin
  foreach t in array array[
    'sites','site_versions','publish_events','themes','pages','events',
    'households','guests','household_event_invites','guest_event_invites',
    'invitations','rsvp_submissions','rsvp_event_responses','rsvp_questions',
    'rsvp_answers','message_batches','message_recipients','assets',
    'subscriptions','purchases','domains','tracking_events','audit_logs',
    'seating_charts','tables','seat_assignments','galleries','photos','updates_feed'
  ]
  loop
    execute format(
      'create policy %1$s_org_all on public.%1$I
         for all using (public.is_org_member(org_id))
         with check (public.is_org_member(org_id));', t);
  end loop;
end $$;

-- provider_webhook_events and suppression_list: RLS on, NO policy → only the
-- service role (which bypasses RLS) can read/write them.

-- ── Bootstrap: mirror a new auth user into public.profiles ─────────────────
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, coalesce(new.email, ''), new.raw_user_meta_data ->> 'name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
