-- ═══════════════════════════════════════════════════════════════════════
-- 0021 — Collaborator invitations the recipient has to accept.
--
-- Misuse review M1. `addCollaborator` used to do two things nobody consented
-- to: it called auth.admin.createUser() to mint a CONFIRMED account for any
-- address typed into a box, and it inserted the membership immediately. There
-- was no acceptance step and no notification. Combined with getPrimarySite()
-- returning the oldest reachable site, that was a workspace takeover; the
-- selection half was fixed in code, but "a stranger can put their wedding in
-- your account" was still true.
--
-- Now: an invitation is a row with a hashed token and an expiry. Nothing is
-- created for the invitee until THEY open the link, sign in as the address
-- that was invited, and accept.
--
-- Tokens follow the guest-link pattern: the raw value is emailed once and
-- never stored, only sha256(TOKEN_PEPPER + raw).
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists collaborator_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  -- Stored lowercase; the accept path compares against the signed-in email.
  email text not null,
  role member_role not null default 'collaborator',
  token_hash text not null unique,
  invited_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid references profiles(id) on delete set null,
  revoked_at timestamptz,
  constraint collab_inv_email_len check (char_length(email) between 3 and 320),
  -- Owner is granted by creating the org, never by invitation. Without this an
  -- invite row could hand out ownership of someone else's wedding.
  constraint collab_inv_role check (role in ('collaborator', 'viewer'))
);

-- One live invitation per address per org: re-inviting updates rather than
-- piling up rows, and revoked/accepted ones don't block a fresh invite.
create unique index if not exists collaborator_invitations_live
  on collaborator_invitations (org_id, lower(email))
  where accepted_at is null and revoked_at is null;

create index if not exists collaborator_invitations_org
  on collaborator_invitations (org_id);

alter table collaborator_invitations enable row level security;

-- Members of the org can SEE its pending invitations (so Settings can list
-- them). Only owners can create or revoke. The invitee is deliberately NOT
-- covered — they are not a member yet, so they reach their invitation through
-- the security-definer RPC below and nothing else.
drop policy if exists collab_inv_read on collaborator_invitations;
create policy collab_inv_read on collaborator_invitations
  for select using (is_org_member(org_id));

drop policy if exists collab_inv_write on collaborator_invitations;
create policy collab_inv_write on collaborator_invitations
  for all
  using (exists (
    select 1 from memberships m
    where m.org_id = collaborator_invitations.org_id
      and m.user_id = auth.uid() and m.role = 'owner'
  ))
  with check (exists (
    select 1 from memberships m
    where m.org_id = collaborator_invitations.org_id
      and m.user_id = auth.uid() and m.role = 'owner'
  ));

-- ── Accept ───────────────────────────────────────────────────────────────
-- Security definer because the caller is by definition NOT yet a member of
-- the org, so no policy could let them read their own invitation row.
--
-- Takes the HASH, not the raw token: the raw value never has to cross into
-- the database, so it cannot land in query logs.
create or replace function accept_collaborator_invitation(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv collaborator_invitations;
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_uid is null then raise exception 'not signed in'; end if;

  -- Lock the row: two clicks on the same link must not create two memberships.
  select * into v_inv from collaborator_invitations
    where token_hash = p_token_hash for update;
  if not found then raise exception 'invitation not found'; end if;
  if v_inv.revoked_at is not null then raise exception 'invitation revoked'; end if;
  if v_inv.accepted_at is not null then raise exception 'invitation already accepted'; end if;
  if v_inv.expires_at < now() then raise exception 'invitation expired'; end if;

  -- The link is a capability, so it must not be enough on its own: whoever
  -- follows it has to be signed in AS the address that was invited. Otherwise
  -- a forwarded email would let anyone join.
  if v_email = '' or v_email <> lower(v_inv.email) then
    raise exception 'wrong account';
  end if;

  insert into memberships (org_id, user_id, role)
  values (v_inv.org_id, v_uid, v_inv.role)
  on conflict (org_id, user_id) do nothing;

  update collaborator_invitations
    set accepted_at = now(), accepted_by = v_uid
    where id = v_inv.id;

  return v_inv.org_id;
end;
$$;

-- Callable by any signed-in user: that is the point — they are not a member
-- yet. Every check that matters is inside the function.
revoke execute on function accept_collaborator_invitation(text) from public, anon;
grant execute on function accept_collaborator_invitation(text) to authenticated, service_role;

-- ── Preview ──────────────────────────────────────────────────────────────
-- Lets the accept page say "Priya invited you to Aanya & Dev" BEFORE the user
-- signs in, without exposing anything they could not already infer from
-- holding the link. Deliberately returns no email address and no ids.
create or replace function peek_collaborator_invitation(p_token_hash text)
returns table (org_name text, invited_email text, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv collaborator_invitations;
  v_org text;
begin
  select * into v_inv from collaborator_invitations where token_hash = p_token_hash;
  if not found then
    return query select null::text, null::text, 'not_found'::text;
    return;
  end if;
  select name into v_org from organisations where id = v_inv.org_id;
  return query select
    v_org,
    -- Masked: enough for "is this the right inbox?", not an address harvest.
    regexp_replace(v_inv.email, '^(.).*(@.*)$', '\1***\2'),
    case
      when v_inv.revoked_at is not null then 'revoked'
      when v_inv.accepted_at is not null then 'accepted'
      when v_inv.expires_at < now() then 'expired'
      else 'pending'
    end;
end;
$$;

revoke execute on function peek_collaborator_invitation(text) from public;
grant execute on function peek_collaborator_invitation(text) to anon, authenticated, service_role;
