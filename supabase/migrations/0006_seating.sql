-- 0006 — seating charts. Tables per event (or site-wide), one seat per guest.
create table seating_tables (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  name text not null,
  capacity int not null default 10 check (capacity >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on seating_tables(site_id, sort_order);

create table seat_assignments (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  table_id uuid not null references seating_tables(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (guest_id)
);
create index on seat_assignments(table_id);

alter table seating_tables enable row level security;
alter table seat_assignments enable row level security;
create policy seating_tables_read on seating_tables for select using (can_access_site(site_id));
create policy seating_tables_write on seating_tables for all using (can_write_site(site_id)) with check (can_write_site(site_id));
create policy seat_assignments_read on seat_assignments for select using (can_access_site(site_id));
create policy seat_assignments_write on seat_assignments for all using (can_write_site(site_id)) with check (can_write_site(site_id));
