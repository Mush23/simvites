-- ═══════════════════════════════════════════════════════════════════════
-- Occasio — Phase 1 schema (handoff §3–§5).
-- Broad nouns only; wedding vocabulary lives in the UI copy layer.
-- Money = integer minor units (pence). Soft-delete via archived_at.
-- Tenant isolation: every tenant row carries site_id → org via sites; RLS on
-- every table. Guests are NOT users — access via hashed token + server routes.
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ===== Enums =====
create type member_role      as enum ('owner','collaborator','viewer');
create type site_status       as enum ('draft','published');
create type event_visibility  as enum ('public','invite_only','hidden');
create type rsvp_status        as enum ('pending','attending','declined');
create type vendor_status      as enum ('shortlisted','contacted','quote_in','booked','declined');
create type budget_status      as enum ('estimated','deposit_paid','part_paid','paid');
create type task_status        as enum ('todo','in_progress','done');
create type task_priority      as enum ('low','normal','high');

-- ===== updated_at helper =====
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ===== Tenancy =====
create table organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
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
  slug text unique not null,
  title text not null,
  labels jsonb not null default '{}',
  theme jsonb not null default '{}',
  status site_status not null default 'draft',
  currency text not null default 'GBP',
  is_unlocked boolean not null default false,
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
  puck_data jsonb not null default '{}',
  unique (site_id, slug)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  preset_key text,
  starts_at timestamptz,
  ends_at timestamptz,
  venue_name text,
  address text,
  description text,
  dress_code text,
  meal_notes text,
  host_side text,
  rsvp_required boolean not null default true,
  capacity int,
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
  name text not null,
  side text,
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

create table invitations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (guest_id, event_id)
);

create table guest_access_tokens (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create table responses (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  status rsvp_status not null default 'pending',
  message text,
  custom jsonb not null default '{}',
  responded_at timestamptz,
  responded_by text,
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
  quote_amount int,
  contracted_amount int,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table vendor_events (
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
  estimated_amount int not null default 0,
  actual_amount int,
  paid_amount int not null default 0,
  due_date date,
  status budget_status not null default 'estimated',
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  budget_item_id uuid not null references budget_items(id) on delete cascade,
  amount int not null,
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
  storage_path text not null,
  name text not null,
  kind text,
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
  snapshot jsonb not null,
  summary text,
  published_by uuid references profiles(id) on delete set null,
  published_at timestamptz not null default now()
);

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  verb text not null,
  entity_type text not null,
  entity_id uuid,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ===== Indexes =====
create index on events(site_id, sort_order);
create index on guests(site_id, household_id);
create index on invitations(site_id, event_id);
create index on responses(site_id, event_id, status);
create index on budget_items(site_id, event_id);
create index on tasks(site_id, status, due_date);
create index on vendor_events(event_id);
create index on guest_access_tokens(token_hash);

create trigger set_updated_at before update on sites
  for each row execute function set_updated_at();
create trigger set_updated_at before update on events
  for each row execute function set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════
-- RLS — helpers + policies
-- ═══════════════════════════════════════════════════════════════════════
create or replace function is_org_member(target_org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from memberships m where m.org_id = target_org and m.user_id = auth.uid());
$$;

create or replace function can_access_site(target_site uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from sites s join memberships m on m.org_id = s.org_id
    where s.id = target_site and m.user_id = auth.uid()
  );
$$;

create or replace function can_write_site(target_site uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from sites s join memberships m on m.org_id = s.org_id
    where s.id = target_site and m.user_id = auth.uid() and m.role in ('owner','collaborator')
  );
$$;

-- Enable RLS everywhere.
do $$ declare t text; begin
  foreach t in array array[
    'organisations','profiles','memberships','sites','pages','events','households',
    'guests','invitations','guest_access_tokens','responses','vendors','vendor_events',
    'budget_items','payments','tasks','files','published_versions','activity_log'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- Identity / tenancy policies.
create policy profiles_self on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy orgs_member_read on organisations
  for select using (is_org_member(id));
create policy orgs_owner_write on organisations
  for all using (exists (select 1 from memberships m where m.org_id = id and m.user_id = auth.uid() and m.role = 'owner'))
  with check (exists (select 1 from memberships m where m.org_id = id and m.user_id = auth.uid() and m.role = 'owner'));

create policy memberships_read on memberships
  for select using (user_id = auth.uid() or is_org_member(org_id));

create policy sites_rw on sites
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));

-- Site-scoped child tables: read = any member, write = owner/collaborator.
do $$ declare t text; begin
  foreach t in array array[
    'pages','events','households','guests','invitations','guest_access_tokens',
    'responses','vendors','budget_items','payments','tasks','files',
    'published_versions','activity_log'
  ] loop
    execute format('create policy %1$s_read on %1$I for select using (can_access_site(site_id));', t);
    execute format('create policy %1$s_write on %1$I for all using (can_write_site(site_id)) with check (can_write_site(site_id));', t);
  end loop;
end $$;

-- vendor_events: derive the site via the parent vendor.
create policy vendor_events_read on vendor_events
  for select using (exists (select 1 from vendors v where v.id = vendor_id and can_access_site(v.site_id)));
create policy vendor_events_write on vendor_events
  for all using (exists (select 1 from vendors v where v.id = vendor_id and can_write_site(v.site_id)))
  with check (exists (select 1 from vendors v where v.id = vendor_id and can_write_site(v.site_id)));

-- ═══════════════════════════════════════════════════════════════════════
-- Auth bootstrap + RPCs
-- ═══════════════════════════════════════════════════════════════════════

-- Mirror new auth users into profiles.
create or replace function handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email,''), new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_auth_user();

-- Create an org (+owner membership) and a first draft site with a home page.
-- SECURITY DEFINER to sidestep the first-insert RLS chicken-and-egg.
create or replace function create_org_and_site(
  p_org_name text, p_site_title text, p_slug text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_site uuid; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  insert into public.profiles (id, email, full_name)
  values (v_uid, coalesce((select email from auth.users where id = v_uid), ''), null)
  on conflict (id) do nothing;

  insert into public.organisations (name)
  values (coalesce(nullif(trim(p_org_name),''),'My organisation')) returning id into v_org;

  insert into public.memberships (org_id, user_id, role) values (v_org, v_uid, 'owner');

  insert into public.sites (org_id, slug, title)
  values (v_org, lower(p_slug), coalesce(nullif(trim(p_site_title),''),'Our wedding'))
  returning id into v_site;

  insert into public.pages (site_id, slug, title, is_home, nav_order)
  values (v_site, 'home', 'Home', true, 0);

  return v_site;
end; $$;

-- Server-side RSVP write with cap + invite enforcement (handoff §5).
create or replace function submit_response(
  p_guest uuid, p_event uuid, p_status rsvp_status,
  p_message text default null, p_custom jsonb default '{}'
) returns void language plpgsql security definer set search_path = public as $$
declare v_site uuid; v_cap int; v_count int;
begin
  if not exists (select 1 from invitations where guest_id=p_guest and event_id=p_event) then
    raise exception 'not invited';
  end if;
  select site_id, capacity into v_site, v_cap from events where id=p_event;
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
