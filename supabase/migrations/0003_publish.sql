-- ─────────────────────────────────────────────────────────────────────────
-- Phase 2 — publishing. publish_site() snapshots the current draft (home page
-- Puck doc + theme + events) into an immutable site_versions row, points the
-- site at it, records a publish_event, and flips status to 'published'.
-- The public renderer reads ONLY this snapshot (never the mutable draft tables).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.publish_site(p_site_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site     public.sites;
  v_snapshot jsonb;
  v_version  uuid;
begin
  select * into v_site from public.sites where id = p_site_id and deleted_at is null;
  if not found then
    raise exception 'site not found';
  end if;
  if not public.is_org_member(v_site.org_id) then
    raise exception 'forbidden';
  end if;

  v_snapshot := jsonb_build_object(
    'schema_version', 1,
    'name', v_site.name,
    'slug', v_site.slug,
    'timezone', v_site.timezone,
    'rsvp_deadline', v_site.rsvp_deadline,
    'page', coalesce(
      (select content_json from public.pages
       where site_id = p_site_id and path = '/' and deleted_at is null limit 1),
      '{}'::jsonb),
    'theme', coalesce(
      (select to_jsonb(t) from public.themes t where t.site_id = p_site_id limit 1),
      '{}'::jsonb),
    'events', coalesce(
      (select jsonb_agg(to_jsonb(e) order by e."order")
       from public.events e
       where e.site_id = p_site_id and e.deleted_at is null and e.visible),
      '[]'::jsonb)
  );

  insert into public.site_versions (org_id, site_id, snapshot_json, published_by)
  values (v_site.org_id, p_site_id, v_snapshot, auth.uid())
  returning id into v_version;

  update public.sites
  set status = 'published', published_version_id = v_version
  where id = p_site_id;

  insert into public.publish_events (org_id, site_id, site_version_id, published_by)
  values (v_site.org_id, p_site_id, v_version, auth.uid());

  insert into public.audit_logs (org_id, actor_type, actor_id, action, target_table, target_id)
  values (v_site.org_id, 'user', auth.uid(), 'publish', 'sites', p_site_id);

  return v_version;
end;
$$;
