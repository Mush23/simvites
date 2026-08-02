-- ═══════════════════════════════════════════════════════════════════════
-- 0025 — An owner can actually remove a collaborator.
--
-- Found walking the collaborator flow end to end. Settings → Remove reported
-- success and changed nothing: the membership was still there afterwards.
--
-- `memberships` has RLS enabled and exactly ONE policy — `memberships_read`,
-- for SELECT. With no DELETE policy, the delete matched zero rows and returned
-- no error, so the action's `if (error)` never fired and the UI said it worked.
-- Nothing had ever inserted into this table directly either: memberships are
-- created by `create_org_and_site` and `accept_collaborator_invitation`, both
-- SECURITY DEFINER, which is why the gap went unnoticed.
--
-- Removing access is the other half of granting it. An invitation flow you
-- cannot reverse is not a consent model.
--
-- Owners only, and owners cannot be removed: ownership comes from creating the
-- org, and letting a collaborator — or an owner's own stray click — strip it
-- would leave a wedding nobody can administer.
-- ═══════════════════════════════════════════════════════════════════════

-- Security definer: a policy ON memberships that queries memberships is
-- directly recursive. Same reason is_org_member exists.
create or replace function is_org_owner(target_org uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    where m.org_id = target_org
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

revoke execute on function is_org_owner(uuid) from public, anon;
grant execute on function is_org_owner(uuid) to authenticated, service_role;

drop policy if exists memberships_owner_delete on memberships;
create policy memberships_owner_delete on memberships
  for delete
  using (role <> 'owner' and is_org_owner(org_id));
