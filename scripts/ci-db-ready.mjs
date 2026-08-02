// Confirms the ephemeral CI database actually has the schema before the
// integration suites run.
//
// Without this, a migration that failed to apply surfaces as a confusing
// PostgREST 404 halfway through a test, and the obvious reading — "tenant
// isolation is broken" — is wrong. Fail early, and say which piece is missing.

import pg from 'pg'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('✗ DATABASE_URL is not set')
  process.exit(1)
}

// Local stack: no TLS. Anything else is a hosted project and must use it.
const isLocal = /(?:localhost|127\.0\.0\.1)/.test(url)
const client = new pg.Client({
  connectionString: url,
  ssl: isLocal ? false : { rejectUnauthorized: false },
})

// The pieces the suites actually depend on, not an exhaustive schema check.
const TABLES = ['organisations', 'memberships', 'sites', 'guests', 'households', 'events', 'invitations', 'responses', 'rsvp_questions', 'rsvp_answers', 'event_allocations']
const FUNCTIONS = ['submit_response', 'can_access_site', 'is_org_member']

let missing = []
try {
  await client.connect()

  const { rows: tables } = await client.query(
    `select table_name from information_schema.tables where table_schema='public'`,
  )
  const have = new Set(tables.map((r) => r.table_name))
  missing.push(...TABLES.filter((t) => !have.has(t)).map((t) => `table ${t}`))

  const { rows: fns } = await client.query(`select proname from pg_proc`)
  const haveFn = new Set(fns.map((r) => r.proname))
  missing.push(...FUNCTIONS.filter((f) => !haveFn.has(f)).map((f) => `function ${f}`))

  // RLS is the thing the isolation suite is actually asserting; if it is off,
  // that suite would pass for the wrong reason on a fresh database.
  const { rows: rls } = await client.query(
    `select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r' and c.relrowsecurity = false
        and c.relname = any($1)`,
    [TABLES],
  )
  missing.push(...rls.map((r) => `RLS disabled on ${r.relname}`))

  // 0019's guards specifically — they have gone missing once already.
  const { rows: src } = await client.query(`select prosrc from pg_proc where proname='submit_response' limit 1`)
  if (src.length && !/missing required answers/.test(src[0].prosrc)) {
    missing.push('submit_response is missing the 0019 required-answer guard')
  }

  if (missing.length) {
    console.error('✗ CI database is not ready:')
    for (const m of missing) console.error(`   - ${m}`)
    console.error('\n  The migrations did not apply. Check the `supabase start` step above.')
    process.exitCode = 1
  } else {
    console.log(`✓ CI database ready — ${TABLES.length} tables, ${FUNCTIONS.length} functions, RLS on, 0019 guards present`)
  }
} catch (e) {
  console.error(`✗ Could not reach the CI database: ${e.message}`)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
