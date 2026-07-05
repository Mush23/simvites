-- ═══════════════════════════════════════════════════════════════════════
-- 0009 — Vendor recommendations directory + mentions.
--
-- Platform-curated recommended vendors couples can browse by category
-- (catering, DJ, decor, coordinator, entertainment, photography, …) and
-- add straight into their own Vendors pipeline. Mentions are short quotes
-- from real couples/planners shown on each recommendation.
--
-- These are GLOBAL (not site-scoped): every signed-in user sees the same
-- curated list. RLS allows read to any authenticated user; writes are
-- service-role only (platform admin curates the list).
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists vendor_directory (
  id uuid primary key default gen_random_uuid(),
  category text not null,               -- catering | dj | decor | coordinator | entertainment | photography | florals | mehndi | transport | cake
  name text not null,
  tagline text,                         -- one-line hook
  blurb text,                           -- 1–2 sentence description
  location text,                        -- e.g. "London & Home Counties"
  price_band text,                      -- ££ / £££ / ££££
  website text,
  instagram text,
  email text,
  phone text,
  rating numeric(2,1),                  -- 0.0–5.0 editorial rating
  featured boolean not null default false,
  sort_order int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists vendor_directory_category_idx on vendor_directory (category) where archived_at is null;

create table if not exists vendor_mentions (
  id uuid primary key default gen_random_uuid(),
  directory_id uuid not null references vendor_directory(id) on delete cascade,
  quote text not null,
  author text,                          -- "Aanya & Dev, Sep 2026"
  source text,                          -- "Verified couple" | "Planner"
  created_at timestamptz not null default now()
);

create index if not exists vendor_mentions_directory_idx on vendor_mentions (directory_id);

-- ── RLS: readable by any authenticated user; writes are service-role only. ──
alter table vendor_directory enable row level security;
alter table vendor_mentions enable row level security;

drop policy if exists vendor_directory_read on vendor_directory;
create policy vendor_directory_read on vendor_directory
  for select using (auth.role() = 'authenticated' and archived_at is null);

drop policy if exists vendor_mentions_read on vendor_mentions;
create policy vendor_mentions_read on vendor_mentions
  for select using (auth.role() = 'authenticated');

-- Trace where a recommendation was adopted from (analytics / dedupe).
alter table vendors add column if not exists source_directory_id uuid references vendor_directory(id) on delete set null;
