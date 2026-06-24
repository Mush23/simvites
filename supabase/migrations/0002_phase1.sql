-- ─────────────────────────────────────────────────────────────────────────
-- Phase 1 RPCs — org bootstrap + create-site-from-template.
--
-- Both run SECURITY DEFINER to sidestep the RLS chicken-and-egg on first
-- insert (a brand-new user has no membership yet), while still pinning every
-- write to auth.uid() / a verified membership.
-- ─────────────────────────────────────────────────────────────────────────

-- Create an organization owned by the current user, with an owner membership.
create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.organizations (owner_user_id, name)
  values (auth.uid(), coalesce(nullif(trim(p_name), ''), 'My organization'))
  returning id into v_org;

  insert into public.memberships (org_id, user_id, role)
  values (v_org, auth.uid(), 'owner');

  return v_org;
end;
$$;

-- Returns the caller's primary org, creating one on first call. Idempotent.
create or replace function public.ensure_personal_org(p_name text default 'My organization')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select m.org_id into v_org
  from public.memberships m
  where m.user_id = auth.uid()
  order by m.created_at asc
  limit 1;

  if v_org is null then
    v_org := public.create_organization(p_name);
  end if;

  return v_org;
end;
$$;

-- Clone a template into a new draft site for an org the caller belongs to:
-- site + theme + default '/' page + events. Returns the new site id.
create or replace function public.create_site_from_template(
  p_org_id uuid,
  p_template_slug text,
  p_name text,
  p_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tpl   public.templates;
  v_site  uuid;
  v_event jsonb;
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'forbidden: not a member of this organization';
  end if;

  select * into v_tpl from public.templates
  where slug = p_template_slug and is_active limit 1;
  if not found then
    raise exception 'template % not found', p_template_slug;
  end if;

  insert into public.sites (org_id, template_id, event_type, name, slug, status)
  values (p_org_id, v_tpl.id, v_tpl.event_type,
          coalesce(nullif(trim(p_name), ''), v_tpl.name),
          lower(p_slug), 'draft')
  returning id into v_site;

  insert into public.themes (org_id, site_id, font_heading, font_body, color_tokens_jsonb, mode_default)
  values (
    p_org_id, v_site,
    coalesce(v_tpl.default_theme_json ->> 'fontHeading', 'Cormorant Garamond'),
    coalesce(v_tpl.default_theme_json ->> 'fontBody', 'Jost'),
    coalesce(v_tpl.default_theme_json -> 'colors', '{}'::jsonb),
    coalesce((v_tpl.default_theme_json ->> 'modeDefault')::theme_mode, 'system')
  );

  insert into public.pages (org_id, site_id, path, title, content_json, "order", is_published)
  values (p_org_id, v_site, '/', coalesce(nullif(trim(p_name), ''), v_tpl.name),
          coalesce(v_tpl.content_json -> '/', '{}'::jsonb), 0, false);

  for v_event in select * from jsonb_array_elements(v_tpl.default_events_json)
  loop
    insert into public.events (
      org_id, site_id, key, name, tagline, event_date, start_time, duration_hours,
      venue, address, theme_label, palette, accent_token, schedule_json, "order", visible
    ) values (
      p_org_id, v_site,
      v_event ->> 'key',
      v_event ->> 'name',
      v_event ->> 'tagline',
      nullif(v_event ->> 'eventDate', '')::date,
      nullif(v_event ->> 'startTime', '')::time,
      nullif(v_event ->> 'durationHours', '')::numeric,
      v_event ->> 'venue',
      v_event ->> 'address',
      v_event ->> 'themeLabel',
      coalesce(v_event -> 'palette', '[]'::jsonb),
      v_event ->> 'accentToken',
      coalesce(v_event -> 'schedule', '[]'::jsonb),
      coalesce((v_event ->> 'order')::int, 0),
      coalesce((v_event ->> 'visible')::boolean, true)
    );
  end loop;

  return v_site;
end;
$$;
