-- Scale-test finding: households, vendors and event_itinerary are filtered by
-- site_id on hot paths (guest matrix, RSVP dashboard, readiness, vendors,
-- publish) but had NO site_id index — only the primary key. At a few hundred
-- rows Postgres correctly seq-scans, but as the platform grows to thousands of
-- sites these become whole-table scans. Match the composite indexes that
-- guests/invitations/responses already have so every per-site read stays an
-- index scan at multi-tenant scale.

create index if not exists households_site_idx on public.households (site_id) where archived_at is null;
create index if not exists vendors_site_idx on public.vendors (site_id) where archived_at is null;
create index if not exists event_itinerary_site_idx on public.event_itinerary (site_id);

-- Guest-scaled child tables benefit from a plain site_id lead too (the existing
-- composite indexes lead with site_id, so these are only added where missing).
create index if not exists guest_access_tokens_site_idx on public.guest_access_tokens (site_id) where revoked = false;
