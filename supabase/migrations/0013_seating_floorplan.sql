-- ═══════════════════════════════════════════════════════════════════════
-- 0013 — Visual seating: table positions, shapes, and a floor-plan image.
--
-- Tables gain a position on a canvas (pos_x / pos_y as 0–100 percentages)
-- and a shape, so hosts arrange the room the way it really looks. A
-- floor-plan background image can be uploaded per event (or for the
-- all-events view), so tables sit over a real plan.
-- ═══════════════════════════════════════════════════════════════════════

alter table seating_tables add column if not exists pos_x numeric(5,2) not null default 50;
alter table seating_tables add column if not exists pos_y numeric(5,2) not null default 50;
alter table seating_tables add column if not exists shape text not null default 'round';  -- round | rect

create table if not exists seating_floorplans (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  image_url text,
  created_at timestamptz not null default now()
);

-- One plan per (site, event-view). Nulls collapse to a sentinel so the
-- all-events view also holds a single plan.
create unique index if not exists seating_floorplans_scope_uidx
  on seating_floorplans (site_id, coalesce(event_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table seating_floorplans enable row level security;

drop policy if exists seating_floorplans_read on seating_floorplans;
create policy seating_floorplans_read on seating_floorplans
  for select using (can_access_site(site_id));

drop policy if exists seating_floorplans_write on seating_floorplans;
create policy seating_floorplans_write on seating_floorplans
  for all using (can_write_site(site_id)) with check (can_write_site(site_id));
