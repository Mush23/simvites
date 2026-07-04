-- 0007 — automatic RSVP backup history. Every insert/update on responses is
-- copied here by trigger: nothing a guest (or bug) does can destroy an
-- answer's audit trail. Read-only to org members; written only by the trigger.

create table response_history (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  guest_id uuid not null,
  event_id uuid not null,
  status rsvp_status not null,
  message text,
  custom jsonb,
  responded_by text,
  recorded_at timestamptz not null default now()
);
create index on response_history(site_id, recorded_at);

alter table response_history enable row level security;
create policy response_history_read on response_history
  for select using (can_access_site(site_id));
-- no insert/update/delete policies: only the definer trigger writes.

create or replace function record_response_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into response_history (site_id, guest_id, event_id, status, message, custom, responded_by)
  values (new.site_id, new.guest_id, new.event_id, new.status, new.message, new.custom, new.responded_by);
  return new;
end; $$;

create trigger on_response_change
  after insert or update on responses
  for each row execute function record_response_history();
