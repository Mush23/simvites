-- ═══════════════════════════════════════════════════════════════════════
-- CI ONLY — never applied to a hosted project.
--
-- A hosted Supabase project ships with default privileges that grant every new
-- table in `public` to anon, authenticated and service_role automatically:
--
--   postgres        {postgres=arwdDxtm/postgres, anon=arwdDxtm/postgres,
--                    authenticated=arwdDxtm/postgres, service_role=arwdDxtm/postgres}
--   supabase_admin  {…the same…}
--
-- (Read off production, so this file mirrors reality rather than a guess.)
-- Table-level access being wide open is intentional in Supabase's model: RLS is
-- what restricts rows, and every table here has it enabled.
--
-- The ephemeral CI stack does not reproduce those default privileges for the
-- role the CLI applies migrations as, so PostgREST answered every request with
--   42501  "Grant the required privileges … GRANT SELECT ON public.organisations"
-- while direct SQL looked perfect. This closes that gap so CI matches
-- production instead of testing a differently-permissioned database.
--
-- ⚠ FUNCTIONS ARE DELIBERATELY NOT TOUCHED. 0003, 0018 and 0019 lock
-- submit_response down to service_role, and production confirms it:
--   submit_response  postgres=X/postgres | service_role=X/postgres
-- A blanket `grant execute on all routines` would hand it to anon and let the
-- RSVP suite pass for the wrong reason — the precise class of bug 4a was.
-- ═══════════════════════════════════════════════════════════════════════

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

-- Anything a later migration creates during this run picks them up too.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
