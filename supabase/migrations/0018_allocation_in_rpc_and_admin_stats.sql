-- ═══════════════════════════════════════════════════════════════════════
-- 0018 — Review fixes (intensive review, 12 Jul 2026).
--
-- 1. Household allocations move INTO submit_response, next to the capacity
--    check under the same event row lock — the app-layer backstop was a
--    TOCTOU race (two devices submitting together could exceed the cap)
--    and cost one COUNT round trip per capped event.
-- 2. Message semantics: NULL now PRESERVES the stored message and '' clears
--    it, so a guest editing one answer no longer wipes the note they left
--    for the couple on every re-submitted row.
-- 3. Admin aggregates: grouped response/guest stats as locked-down
--    functions, replacing full-table fetchAll scans on the admin dashboard
--    and CSV export.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function submit_response(
  p_guest uuid,
  p_event uuid,
  p_status rsvp_status,
  p_message text default null,
  p_custom jsonb default '{}',
  p_answers jsonb default '[]'   -- [{"question_id": uuid, "value": <jsonb>}]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site uuid;
  v_cap int;
  v_deadline timestamptz;
  v_event_archived timestamptz;
  v_count int;
  v_household uuid;
  v_alloc int;
  r jsonb;
  v_q rsvp_questions;
begin
  -- Lock the event row: concurrent submissions for the same event serialise
  -- here, making the capacity AND allocation checks below race-free.
  select site_id, capacity, rsvp_deadline, archived_at
    into v_site, v_cap, v_deadline, v_event_archived
    from events where id = p_event
    for update;
  if not found then raise exception 'event not found'; end if;
  if v_event_archived is not null then raise exception 'event archived'; end if;

  -- Guest must exist on this site and not be archived.
  select household_id into v_household
    from guests g
    where g.id = p_guest and g.site_id = v_site and g.archived_at is null;
  if not found then raise exception 'guest not found'; end if;

  -- Must actually be invited (USP #2: invitation = guest × event).
  if not exists (select 1 from invitations where guest_id = p_guest and event_id = p_event) then
    raise exception 'not invited';
  end if;

  -- Deadline: event-level, else the site default. Passed ⇒ read-only.
  if v_deadline is null then
    select rsvp_deadline_default into v_deadline from sites where id = v_site;
  end if;
  if v_deadline is not null and now() > v_deadline then
    raise exception 'deadline passed';
  end if;

  -- Capacity (under the row lock, so this cannot oversell).
  if p_status = 'attending' and v_cap is not null then
    select count(*) into v_count from responses
      where event_id = p_event and status = 'attending' and guest_id <> p_guest;
    if v_count >= v_cap then raise exception 'event full'; end if;
  end if;

  -- Household allocation ("up to N of you") — same lock, same guarantee.
  if p_status = 'attending' then
    select max_guests into v_alloc from event_allocations
      where household_id = v_household and event_id = p_event;
    if v_alloc is not null then
      select count(*) into v_count
        from responses r2
        join guests g2 on g2.id = r2.guest_id
        where r2.event_id = p_event and r2.status = 'attending'
          and g2.household_id = v_household and r2.guest_id <> p_guest;
      if v_count >= v_alloc then raise exception 'allocation full'; end if;
    end if;
  end if;

  -- Upsert the per-event response. Message contract: NULL preserves what is
  -- already stored (an edit that doesn't touch the note keeps it), '' clears
  -- it deliberately, text replaces it.
  insert into responses (site_id, guest_id, event_id, status, message, custom, responded_at, responded_by)
  values (v_site, p_guest, p_event, p_status, nullif(p_message, ''), p_custom, now(), 'guest')
  on conflict (guest_id, event_id)
  do update set status = excluded.status,
                message = case when p_message is null then responses.message
                               else nullif(p_message, '') end,
                custom = excluded.custom, responded_at = now(), responded_by = 'guest';

  -- Store answers. Each must be a live question on this site, scoped to this
  -- event or to the whole wedding.
  for r in select * from jsonb_array_elements(p_answers)
  loop
    select * into v_q from rsvp_questions
      where id = (r ->> 'question_id')::uuid
        and site_id = v_site
        and archived_at is null;
    if not found then raise exception 'unknown question %', r ->> 'question_id'; end if;
    if v_q.event_id is not null and v_q.event_id <> p_event then
      raise exception 'question % is not for this event', v_q.key;
    end if;

    insert into rsvp_answers (site_id, guest_id, question_id, value)
    values (v_site, p_guest, (r ->> 'question_id')::uuid, r -> 'value')
    on conflict (guest_id, question_id)
    do update set value = excluded.value, answered_at = now();
  end loop;
end;
$$;

revoke execute on function submit_response(uuid, uuid, rsvp_status, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function submit_response(uuid, uuid, rsvp_status, text, jsonb, jsonb)
  to service_role;

-- ── Admin aggregates: O(sites) rows instead of full-table scans ──────────

create or replace function admin_response_stats()
returns table (site_id uuid, total bigint, last_at timestamptz, last_day bigint)
language sql stable
security definer
set search_path = public
as $$
  select site_id,
         count(*)::bigint,
         max(responded_at),
         (count(*) filter (where responded_at > now() - interval '24 hours'))::bigint
  from responses
  group by site_id
$$;

revoke execute on function admin_response_stats() from public, anon, authenticated;
grant execute on function admin_response_stats() to service_role;

create or replace function admin_guest_counts()
returns table (site_id uuid, total bigint)
language sql stable
security definer
set search_path = public
as $$
  select site_id, count(*)::bigint from guests where archived_at is null group by site_id
$$;

revoke execute on function admin_guest_counts() from public, anon, authenticated;
grant execute on function admin_guest_counts() to service_role;
