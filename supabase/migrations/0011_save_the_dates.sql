-- ═══════════════════════════════════════════════════════════════════════
-- 0011 — Save the Dates.
--
-- A shareable pre-invitation announcement. The couple picks which events it
-- covers (one, some, or all — "combine events"), a look, a photo and a short
-- message. It publishes to a public link at /std/<share_token> that can go
-- out by WhatsApp, email, QR or print. The share token is PUBLIC by design
-- (meant to be forwarded), so it's a plain unguessable slug, not a peppered
-- guest token.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists save_the_dates (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  share_token text not null unique,
  headline text not null default 'Save the Date',
  names text,
  message text,
  date_text text,                        -- "September 2026" or a specific date, host's words
  location text,
  photo_url text,
  palette text not null default 'template',  -- template | gold | oxblood | sage | ink | midnight
  event_ids uuid[] not null default '{}', -- which events this announcement covers
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists save_the_dates_site_idx on save_the_dates (site_id);

-- Site-scoped RLS for the host's own management.
alter table save_the_dates enable row level security;

drop policy if exists save_the_dates_read on save_the_dates;
create policy save_the_dates_read on save_the_dates
  for select using (can_access_site(site_id));

drop policy if exists save_the_dates_write on save_the_dates;
create policy save_the_dates_write on save_the_dates
  for all using (can_write_site(site_id)) with check (can_write_site(site_id));

-- Public read of a PUBLISHED save-the-date happens server-side via the
-- service-role client (like published_versions), so no anon policy is needed.
