-- ═══════════════════════════════════════════════════════════════════════
-- 0019 — Restore RSVP answer validation lost in 0018.
--
-- 0005_answer_validation.sql added three guards to submit_response. 0018
-- reimplemented the function to move household allocation inside the event row
-- lock, and carried over everything EXCEPT those guards. Nothing looked wrong,
-- because capacity, deadlines, invite-gating and the concurrency fix all
-- survived — but two of the RSVP suite's assertions have been failing since,
-- and nobody was running it.
--
-- Live consequences until this lands:
--   • a guest can be marked ATTENDING without answering a REQUIRED question,
--     so meal-choice and dietary numbers are incomplete and the couple only
--     discovers it at the venue
--   • an answer OUTSIDE the question's option list is accepted and stored, so
--     a fixed-choice question can hold arbitrary text
--
-- This is 0018's body verbatim plus the three restored blocks, marked below.
-- Everything 0018 introduced is preserved deliberately: the row lock, the
-- allocation check, and the message contract where NULL keeps the stored note
-- and '' clears it.
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

    -- ── RESTORED (0005) — the value must match the question's type/options ──
    -- Without this a single_choice question happily stores free text.
    if v_q.type in ('single_choice', 'meal_choice') then
      if not exists (select 1 from jsonb_array_elements_text(v_q.options) o where o = (r ->> 'value')) then
        raise exception 'invalid option for %', v_q.key;
      end if;
    elsif v_q.type = 'multi_choice' then
      if jsonb_typeof(r -> 'value') <> 'array' or exists (
        select 1 from jsonb_array_elements_text(r -> 'value') v
        where not exists (select 1 from jsonb_array_elements_text(v_q.options) o where o = v)
      ) then
        raise exception 'invalid option for %', v_q.key;
      end if;
    elsif v_q.type = 'yes_no' then
      if jsonb_typeof(r -> 'value') <> 'boolean' then
        raise exception 'invalid option for %', v_q.key;
      end if;
    end if;

    insert into rsvp_answers (site_id, guest_id, question_id, value)
    -- RESTORED (0005): coalesce. rsvp_answers.value is NOT NULL, so an entry
    -- posted without a "value" key raised a constraint violation under 0018
    -- rather than storing JSON null.
    values (v_site, p_guest, v_q.id, coalesce(r -> 'value', 'null'::jsonb))
    on conflict (guest_id, question_id)
    do update set value = excluded.value, answered_at = now();
  end loop;

  -- ── RESTORED (0005) — required questions must be answered to attend ───────
  -- Scoped to this event or the whole wedding, and only unconditional ones:
  -- a question gated behind show_if must not block a submission that never
  -- triggered it. Declining is always allowed.
  if p_status = 'attending' then
    if exists (
      select 1 from rsvp_questions q
      where q.site_id = v_site
        and q.archived_at is null
        and q.required
        and q.show_if is null
        and (q.event_id is null or q.event_id = p_event)
        and not exists (
          select 1 from rsvp_answers a
          where a.guest_id = p_guest and a.question_id = q.id
        )
    ) then
      raise exception 'missing required answers';
    end if;
  end if;
end;
$$;

-- `create or replace` keeps existing privileges, but restate them so the
-- lockdown is legible here rather than only in 0003/0018.
revoke execute on function submit_response(uuid, uuid, rsvp_status, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function submit_response(uuid, uuid, rsvp_status, text, jsonb, jsonb)
  to service_role;
