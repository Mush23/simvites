-- ═══════════════════════════════════════════════════════════════════════
-- 0003 — RPC lockdown.
-- submit_response is SECURITY DEFINER and, by Postgres default, EXECUTE is
-- granted to PUBLIC — meaning anyone holding the anon key could invoke it
-- directly via PostgREST with guessed UUIDs, bypassing token validation.
-- Guests must only reach it through our server routes (handoff §5), so it is
-- executable by the service role alone.
-- ═══════════════════════════════════════════════════════════════════════

revoke execute on function submit_response(uuid, uuid, rsvp_status, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function submit_response(uuid, uuid, rsvp_status, text, jsonb, jsonb)
  to service_role;

-- create_org_and_site stays executable by authenticated users (onboarding).
