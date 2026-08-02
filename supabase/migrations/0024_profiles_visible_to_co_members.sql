-- ═══════════════════════════════════════════════════════════════════════
-- 0024 — You can see who has access to your wedding.
--
-- Found walking the collaborator flow end to end. After an invitation is
-- accepted, Settings → Collaborators listed the new member as:
--
--     unknown            COLLABORATOR   Remove
--
-- `profiles` had a single policy, `profiles_self => (id = auth.uid())`, so the
-- embedded `profiles(email)` in the memberships query returned NULL for anyone
-- other than yourself. The owner's own row rendered fine, which is what made it
-- look like a display quirk rather than a permissions one.
--
-- That is worse than cosmetic: the Remove button sits next to a name you cannot
-- read. With two or three collaborators there is no way to tell which one you
-- are about to remove.
--
-- Someone who can plan your wedding is someone you are entitled to identify, so
-- profiles become readable to people who share an organisation — and to nobody
-- else. `profiles_self` stays, so a user with no memberships can still read
-- their own row.
-- ═══════════════════════════════════════════════════════════════════════

-- Security definer for the same reason is_org_member is: the policy below
-- queries memberships, and evaluating that table's own RLS inside a policy
-- expression is both slower and a recursion hazard.
create or replace function shares_org_with(target_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from memberships mine
    join memberships theirs on theirs.org_id = mine.org_id
    where mine.user_id = auth.uid()
      and theirs.user_id = target_user
  );
$$;

revoke execute on function shares_org_with(uuid) from public, anon;
grant execute on function shares_org_with(uuid) to authenticated, service_role;

drop policy if exists profiles_org_visible on profiles;
create policy profiles_org_visible on profiles
  for select using (shares_org_with(id));
