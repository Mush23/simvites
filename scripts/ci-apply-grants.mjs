// Applies supabase/ci-grants.sql to the ephemeral CI database.
//
// Uses node-postgres rather than psql so it does not depend on what happens to
// be installed on the runner image. Refuses to run against anything that is not
// obviously a local stack — these grants belong nowhere near a hosted project.

import fs from 'node:fs'
import pg from 'pg'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('✗ DATABASE_URL is not set')
  process.exit(1)
}

if (!/(?:localhost|127\.0\.0\.1)/.test(url)) {
  console.error('✗ Refusing to apply CI grants to a non-local database.')
  console.error('  DATABASE_URL does not point at localhost — this script is for the')
  console.error('  ephemeral CI stack only. A hosted project already has these grants.')
  process.exit(1)
}

const sql = fs.readFileSync('supabase/ci-grants.sql', 'utf8')
const client = new pg.Client({ connectionString: url, ssl: false })

try {
  await client.connect()
  await client.query(sql)
  const { rows } = await client.query(
    `select grantee, count(*)::int n
       from information_schema.role_table_grants
      where table_schema='public' and grantee in ('anon','authenticated','service_role')
      group by grantee order by grantee`,
  )
  console.log('✓ CI grants applied:')
  for (const r of rows) console.log(`   ${r.grantee.padEnd(15)} ${r.n} table privileges`)
} catch (e) {
  console.error(`✗ Could not apply CI grants: ${e.message}`)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
