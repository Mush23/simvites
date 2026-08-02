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
    await client.end().catch(() => {})
    process.exit(1)
  }
  console.log(`✓ schema ready — ${TABLES.length} tables, ${FUNCTIONS.length} functions, RLS on, 0019 guards present`)

  // ── PostgREST, which is what the suites actually talk to ────────────────
  //
  // The schema being correct is not enough. PostgREST caches the schema at
  // startup, and on a fresh stack it can come up before the migrations land —
  // leaving every table invisible over REST while direct SQL looks perfect.
  // That failed as `Cannot read properties of null (reading 'id')` deep inside
  // the isolation suite, because the suite ignores insert errors.
  //
  // Nudge the cache, then poll until REST agrees with SQL.
  await client.query(`notify pgrst, 'reload schema'`)

  const restUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!restUrl || !key) {
    console.error('✗ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set')
    process.exitCode = 1
  } else {
    const headers = { apikey: key, Authorization: `Bearer ${key}` }
    let lastErr = 'no attempt made'
    let ok = false
    for (let attempt = 1; attempt <= 20 && !ok; attempt++) {
      try {
        const res = await fetch(`${restUrl}/rest/v1/organisations?select=id&limit=1`, { headers })
        if (res.ok) { ok = true; break }
        lastErr = `HTTP ${res.status} ${(await res.text()).slice(0, 120)}`
      } catch (e) {
        lastErr = e.message
      }
      if (attempt % 5 === 0) await client.query(`notify pgrst, 'reload schema'`)
      await new Promise((r) => setTimeout(r, 1000))
    }
    if (ok) {
      console.log('✓ PostgREST is serving the migrated schema')
    } else {
      console.error(`✗ PostgREST never picked up the schema: ${lastErr}`)
      process.exitCode = 1
    }
  }
} catch (e) {
  console.error(`✗ Could not reach the CI database: ${e.message}`)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
