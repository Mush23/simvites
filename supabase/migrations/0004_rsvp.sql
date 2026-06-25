-- ─────────────────────────────────────────────────────────────────────────
-- Phase 3 — RSVP integrity. submit_rsvp() runs the whole submission as one
-- atomic function (brief §10): deadline open, household belongs to site,
-- invited events/guests only, household caps enforced, previous active
-- submission superseded, single active per household.
--
-- Guests are not auth users; this is invoked by trusted server code (service
-- role) after the guest is identified by their household. SECURITY DEFINER and
-- does not depend on auth.uid().
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.submit_rsvp(
  p_site_id      uuid,
  p_household_id uuid,
  p_submitted_by text,
  p_message      text,
  p_responses    jsonb,        -- [{ "guest_id": uuid, "event_id": uuid, "attending": bool }]
  p_ip_hash      text default null,
  p_ua_hash      text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site        public.sites;
  v_org         uuid;
  v_submission  uuid;
  r             jsonb;
  v_attending   int;
  v_cap         int;
  v_event       uuid;
  rec           record;
begin
  select * into v_site from public.sites where id = p_site_id and deleted_at is null;
  if not found then raise exception 'site not found'; end if;
  v_org := v_site.org_id;

  -- Household must belong to this site.
  if not exists (
    select 1 from public.households h
    where h.id = p_household_id and h.site_id = p_site_id and h.deleted_at is null
  ) then
    raise exception 'household does not belong to this site';
  end if;

  -- Deadline lock (timezone-aware): closed once the site timezone's date passes.
  if v_site.rsvp_deadline is not null
     and (now() at time zone v_site.timezone)::date
         > (v_site.rsvp_deadline at time zone v_site.timezone)::date then
    raise exception 'rsvp_closed';
  end if;

  -- Validate every response row before writing anything.
  for r in select * from jsonb_array_elements(p_responses)
  loop
    v_event := (r ->> 'event_id')::uuid;

    -- Guest must belong to this household.
    if not exists (
      select 1 from public.guests g
      where g.id = (r ->> 'guest_id')::uuid
        and g.household_id = p_household_id and g.deleted_at is null
    ) then
      raise exception 'guest % not in household', r ->> 'guest_id';
    end if;

    -- Event must belong to this site.
    if not exists (
      select 1 from public.events e where e.id = v_event and e.site_id = p_site_id
    ) then
      raise exception 'event % not on this site', v_event;
    end if;

    -- Attending requires both the household and the guest to be invited.
    if coalesce((r ->> 'attending')::boolean, false) then
      if not exists (
        select 1 from public.household_event_invites hei
        where hei.household_id = p_household_id and hei.event_id = v_event
          and hei.invited and hei.household_cap > 0
      ) then
        raise exception 'household not invited to event %', v_event;
      end if;
      if not exists (
        select 1 from public.guest_event_invites gei
        where gei.guest_id = (r ->> 'guest_id')::uuid and gei.event_id = v_event and gei.invited
      ) then
        raise exception 'guest not invited to event %', v_event;
      end if;
    end if;
  end loop;

  -- Cap check: attending count per event must not exceed the household cap.
  for rec in
    select (je ->> 'event_id')::uuid as event_id,
           count(*) filter (where coalesce((je ->> 'attending')::boolean, false)) as attending
    from jsonb_array_elements(p_responses) as je
    group by (je ->> 'event_id')::uuid
  loop
    select household_cap into v_cap
    from public.household_event_invites
    where household_id = p_household_id and event_id = rec.event_id;

    if rec.attending > coalesce(v_cap, 0) then
      raise exception 'cap_exceeded for event %', rec.event_id;
    end if;
  end loop;

  -- Supersede the previous active submission, then insert the new one.
  update public.rsvp_submissions
  set status = 'superseded'
  where household_id = p_household_id and status = 'active';

  insert into public.rsvp_submissions
    (org_id, site_id, household_id, status, submitted_by, message, ip_hash, user_agent_hash)
  values
    (v_org, p_site_id, p_household_id, 'active', p_submitted_by, p_message, p_ip_hash, p_ua_hash)
  returning id into v_submission;

  insert into public.rsvp_event_responses
    (org_id, site_id, rsvp_submission_id, guest_id, event_id, attending)
  select v_org, p_site_id, v_submission,
         (je ->> 'guest_id')::uuid, (je ->> 'event_id')::uuid,
         coalesce((je ->> 'attending')::boolean, false)
  from jsonb_array_elements(p_responses) as je;

  insert into public.audit_logs (org_id, actor_type, action, target_table, target_id, metadata)
  values (v_org, 'guest', 'rsvp_submit', 'rsvp_submissions', v_submission,
          jsonb_build_object('household_id', p_household_id));

  return v_submission;
end;
$$;
