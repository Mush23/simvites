-- ═══════════════════════════════════════════════════════════════════════
-- 0017 — Per-household event allocations ("up to N guests").
--
-- Ported from the original maharshi-simran-wedding site: a household can
-- be given a cap per event ("the Shahs may bring up to 4 to the
-- Reception") — how Indian weddings are actually planned: day events
-- open, evening events capped. NULL/absent = no cap; the named-guest
-- invite matrix keeps working exactly as before.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists event_allocations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  max_guests int not null check (max_guests >= 1),
  created_at timestamptz not null default now(),
  unique (household_id, event_id)
);

create index if not exists event_allocations_site_idx on event_allocations (site_id, event_id);

alter table event_allocations enable row level security;

drop policy if exists event_allocations_read on event_allocations;
create policy event_allocations_read on event_allocations
  for select using (can_access_site(site_id));

drop policy if exists event_allocations_write on event_allocations;
create policy event_allocations_write on event_allocations
  for all using (can_write_site(site_id)) with check (can_write_site(site_id));
