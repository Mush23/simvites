-- ═══════════════════════════════════════════════════════════════════════
-- 0005 — answer-type validation in submit_response (review finding #3).
-- Choice/meal answers must be one of the question's options; multi_choice
-- must be an array ⊆ options; yes_no must be boolean. Text passes through.
-- Full function re-created (body otherwise identical to 0002).
-- ═══════════════════════════════════════════════════════════════════════

create or replace function submit_response(
  p_guest uuid,
  p_event uuid,
  p_status rsvp_status,
  p_message text default null,
  p_custom jsonb default '{}',
  p_answers jsonb default '[]'
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
  r jsonb;
  v_q rsvp_questions;
begin
  select site_id, capacity, rsvp_deadline, archived_at
    into v_site, v_cap, v_deadline, v_event_archived
    from events where id = p_event
    for update;
  if not found then raise exception 'event not found'; end if;
  if v_event_archived is not null then raise exception 'event archived'; end if;

  if not exists (
    select 1 from guests g
    where g.id = p_guest and g.site_id = v_site and g.archived_at is null
  ) then
    raise exception 'guest not found';
  end if;

  if not exists (select 1 from invitations where guest_id = p_guest and event_id = p_event) then
    raise exception 'not invited';
  end if;

  if v_deadline is null then
    select rsvp_deadline_default into v_deadline from sites where id = v_site;
  end if;
  if v_deadline is not null and now() > v_deadline then
    raise exception 'deadline passed';
  end if;

  if p_status = 'attending' and v_cap is not null then
    select count(*) into v_count from responses
      where event_id = p_event and status = 'attending' and guest_id <> p_guest;
    if v_count >= v_cap then raise exception 'event full'; end if;
  end if;

  insert into responses (site_id, guest_id, event_id, status, message, custom, responded_at, responded_by)
  values (v_site, p_guest, p_event, p_status, p_message, p_custom, now(), 'guest')
  on conflict (guest_id, event_id)
  do update set status = excluded.status, message = excluded.message,
                custom = excluded.custom, responded_at = now(), responded_by = 'guest';

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

    -- NEW: value must match the question's type/options.
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
    values (v_site, p_guest, v_q.id, coalesce(r -> 'value', 'null'::jsonb))
    on conflict (guest_id, question_id)
    do update set value = excluded.value, answered_at = now();
  end loop;

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

-- Re-assert the lockdown (create or replace resets grants on some setups).
revoke execute on function submit_response(uuid, uuid, rsvp_status, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function submit_response(uuid, uuid, rsvp_status, text, jsonb, jsonb)
  to service_role;
