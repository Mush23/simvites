-- ═══════════════════════════════════════════════════════════════════════
-- 0002 — RSVP foundation hardening (the crown jewels, finished properly).
--
-- 1. Deadlines: per-event rsvp_deadline overriding a site-level default,
--    enforced server-side in submit_response.
-- 2. Capacity race FIXED: the event row is locked (select … for update)
--    before counting attendees, so concurrent submissions serialise and can
--    never oversell an event. (The handoff's original count-then-insert was
--    racy — audit finding #1.)
-- 3. Custom RSVP questions as first-class schema: typed questions scoped to
--    the whole wedding or a single event, required flags, conditional
--    show_if, plus an answers table. UI arrives in 1C; the data layer and
--    server-side enforcement are complete NOW.
-- 4. Plus-ones: per-guest allow flag + self-reference for the +1's own row.
-- 5. Archived guests/events can no longer respond / be responded to.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Deadlines ─────────────────────────────────────────────────────────────
alter table sites  add column if not exists rsvp_deadline_default timestamptz;
alter table events add column if not exists rsvp_deadline timestamptz;

-- ── Plus-ones ─────────────────────────────────────────────────────────────
alter table guests add column if not exists plus_one_allowed boolean not null default false;
alter table guests add column if not exists plus_one_of uuid references guests(id) on delete cascade;
create index if not exists guests_plus_one_of_idx on guests(plus_one_of) where plus_one_of is not null;

-- ── Custom RSVP questions ────────────────────────────────────────────────
create type question_type as enum ('yes_no','single_choice','multi_choice','text','meal_choice');

create table rsvp_questions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,  -- null = asked once for the whole wedding
  key text not null,                                       -- stable identifier, e.g. 'meal', 'song_request'
  label text not null,
  help_text text,
  type question_type not null default 'text',
  options jsonb not null default '[]',                     -- choices for *_choice / meal_choice
  required boolean not null default false,
  show_if jsonb,                                           -- {"question_key": "...", "equals": <value>} — conditional display
  sort_order int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (site_id, key)
);
create index on rsvp_questions(site_id, sort_order);

create table rsvp_answers (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  question_id uuid not null references rsvp_questions(id) on delete cascade,
  value jsonb not null,
  answered_at timestamptz not null default now(),
  unique (guest_id, question_id)
);
create index on rsvp_answers(site_id, question_id);

-- RLS: same site-scoped pattern as every other tenant table.
alter table rsvp_questions enable row level security;
alter table rsvp_answers  enable row level security;
create policy rsvp_questions_read  on rsvp_questions for select using (can_access_site(site_id));
create policy rsvp_questions_write on rsvp_questions for all using (can_write_site(site_id)) with check (can_write_site(site_id));
create policy rsvp_answers_read    on rsvp_answers  for select using (can_access_site(site_id));
create policy rsvp_answers_write   on rsvp_answers  for all using (can_write_site(site_id)) with check (can_write_site(site_id));

-- ── submit_response v2 ────────────────────────────────────────────────────
-- Extended signature (answers payload); old 5-arg version dropped — no
-- callers exist yet (guest UI arrives in 1C).
drop function if exists submit_response(uuid, uuid, rsvp_status, text, jsonb);

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
  r jsonb;
  v_q rsvp_questions;
begin
  -- Lock the event row: concurrent submissions for the same event serialise
  -- here, making the capacity check below race-free.
  select site_id, capacity, rsvp_deadline, archived_at
    into v_site, v_cap, v_deadline, v_event_archived
    from events where id = p_event
    for update;
  if not found then raise exception 'event not found'; end if;
  if v_event_archived is not null then raise exception 'event archived'; end if;

  -- Guest must exist on this site and not be archived.
  if not exists (
    select 1 from guests g
    where g.id = p_guest and g.site_id = v_site and g.archived_at is null
  ) then
    raise exception 'guest not found';
  end if;

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

  -- Upsert the per-event response.
  insert into responses (site_id, guest_id, event_id, status, message, custom, responded_at, responded_by)
  values (v_site, p_guest, p_event, p_status, p_message, p_custom, now(), 'guest')
  on conflict (guest_id, event_id)
  do update set status = excluded.status, message = excluded.message,
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
    values (v_site, p_guest, v_q.id, coalesce(r -> 'value', 'null'::jsonb))
    on conflict (guest_id, question_id)
    do update set value = excluded.value, answered_at = now();
  end loop;

  -- Required questions must be answered when attending. Conditional (show_if)
  -- questions are exempt here — their requiredness depends on another answer,
  -- which the 1C guest flow evaluates; unconditionally-required ones are hard-
  -- enforced at the data layer.
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
