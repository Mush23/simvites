-- ─────────────────────────────────────────────────────────────────────────
-- Targeted reset for the Simvites→Occasio in-place rebuild.
-- Drops ONLY the Simvites objects (founder authorised dropping the Simvites
-- test data). Does NOT touch the public schema grants, extensions, or auth.*.
-- ─────────────────────────────────────────────────────────────────────────

-- Tables (cascade clears their indexes/policies/FKs).
drop table if exists
  public.updates_feed, public.photos, public.galleries, public.seat_assignments,
  public.tables, public.seating_charts, public.audit_logs, public.tracking_events,
  public.domains, public.purchases, public.subscriptions, public.assets,
  public.suppression_list, public.provider_webhook_events, public.message_recipients,
  public.message_batches, public.rsvp_answers, public.rsvp_questions,
  public.rsvp_event_responses, public.rsvp_submissions, public.invitations,
  public.guest_event_invites, public.household_event_invites, public.guests,
  public.households, public.events, public.pages, public.themes,
  public.publish_events, public.site_versions, public.sites, public.templates,
  public.memberships, public.organizations, public.profiles,
  public.schema_migrations
  cascade;

-- Functions (cascade drops the auth.users trigger on_auth_user_created).
drop function if exists public.handle_new_auth_user() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.is_org_member(uuid) cascade;
drop function if exists public.has_org_role(uuid, org_role[]) cascade;
drop function if exists public.is_org_owner(uuid) cascade;
drop function if exists public.create_organization(text) cascade;
drop function if exists public.ensure_personal_org(text) cascade;
drop function if exists public.create_site_from_template(uuid, text, text, text) cascade;
drop function if exists public.publish_site(uuid) cascade;
drop function if exists public.submit_rsvp(uuid, uuid, text, text, jsonb, text, text) cascade;

-- Enums.
drop type if exists
  org_role, site_status, theme_mode, event_site_type, message_channel,
  batch_status, message_status, rsvp_status, rsvp_question_type, domain_type,
  ssl_status, subscription_status, purchase_status, actor_type
  cascade;
