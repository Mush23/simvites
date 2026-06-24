// Verify the schema applied: list public tables, confirm RLS is on, and check
// the seeded Template #1 row.
//
// Usage:  node --env-file=.env.local scripts/db-verify.mjs

import pg from 'pg'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('✗ DATABASE_URL is not set.')
  process.exit(1)
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()

  const tables = await client.query(`
    select count(*)::int as n
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  `)
  console.log(`✓ public tables: ${tables.rows[0].n}`)

  const rls = await client.query(`
    select count(*)::int as n
    from pg_tables
    where schemaname = 'public' and rowsecurity = true
  `)
  console.log(`✓ tables with RLS enabled: ${rls.rows[0].n}`)

  const tpl = await client.query(`select slug, name, jsonb_array_length(default_events_json) as events from public.templates`)
  if (tpl.rows.length) {
    for (const r of tpl.rows) {
      console.log(`✓ template: ${r.slug} ("${r.name}") — ${r.events} events seeded`)
    }
  } else {
    console.log('⚠ no templates seeded yet')
  }
} catch (err) {
  console.error(`✗ Verify failed: ${err.message}`)
  process.exitCode = 1
} finally {
  await client.end()
}
