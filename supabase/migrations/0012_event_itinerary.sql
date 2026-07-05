-- ═══════════════════════════════════════════════════════════════════════
-- 0012 — Per-event itinerary (the running order of the day).
--
-- Each event gets a timed schedule — "4:00 arrival", "5:30 ceremony",
-- "7:00 dinner" — that guests see under that event on the public site, so
-- everyone knows the plan for the day. Host-managed on the event detail
-- page; frozen into the publish snapshot with its event.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists event_itinerary (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  time_label text,                       -- host's words: "4:00 PM", "Sunset", "After lunch"
  title text not null,
  note text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists event_itinerary_event_idx on event_itinerary (event_id, sort_order);

alter table event_itinerary enable row level security;

drop policy if exists event_itinerary_read on event_itinerary;
create policy event_itinerary_read on event_itinerary
  for select using (can_access_site(site_id));

drop policy if exists event_itinerary_write on event_itinerary;
create policy event_itinerary_write on event_itinerary
  for all using (can_write_site(site_id)) with check (can_write_site(site_id));
