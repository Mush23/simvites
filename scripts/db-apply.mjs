// Apply SQL files to the database in DATABASE_URL.
// Runs every supabase/migrations/*.sql (sorted) then supabase/seed.sql.
//
// Usage:  node --env-file=.env.local scripts/db-apply.mjs
//         node --env-file=.env.local scripts/db-apply.mjs supabase/seed.sql   (one file)
//
// DATABASE_URL must be the Supabase Postgres connection string (Session or
// Transaction pooler URI, password included). SSL is required by Supabase.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('✗ DATABASE_URL is not set. Add it to .env.local and re-run with --env-file=.env.local')
  process.exit(1)
}

function collectFiles() {
  const explicit = process.argv.slice(2)
  if (explicit.length) return explicit

  const files = []
  const migrationsDir = 'supabase/migrations'
  if (existsSync(migrationsDir)) {
    for (const f of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
      files.push(join(migrationsDir, f))
    }
  }
  if (existsSync('supabase/seed.sql')) files.push('supabase/seed.sql')
  return files
}

const files = collectFiles()
if (!files.length) {
  console.error('✗ No SQL files found to apply.')
  process.exit(1)
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  console.log('✓ Connected to database')
  for (const file of files) {
    const sql = readFileSync(file, 'utf8')
    process.stdout.write(`→ Applying ${file} … `)
    await client.query(sql)
    console.log('done')
  }
  console.log('✓ All SQL applied successfully')
} catch (err) {
  console.error(`\n✗ Failed: ${err.message}`)
  process.exitCode = 1
} finally {
  await client.end()
}
