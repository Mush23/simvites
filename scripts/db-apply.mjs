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

const explicitFiles = process.argv.slice(2)
const files = collectFiles()
if (!files.length) {
  console.error('✗ No SQL files found to apply.')
  process.exit(1)
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
})

// A migration file is applied at most once (tracked in schema_migrations).
// seed.sql is idempotent (upsert) and always re-runs. Explicit-file mode runs
// exactly what you pass, no tracking.
function isMigration(file) {
  return file.replace(/\\/g, '/').includes('supabase/migrations/')
}

try {
  await client.connect()
  console.log('✓ Connected to database')

  await client.query(`
    create table if not exists public.schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `)

  // Baseline: if 0001 ran before this tracker existed, record it so it's skipped.
  const baselined = await client.query(`
    insert into public.schema_migrations (filename)
    select '0001_init.sql'
    where exists (select 1 from information_schema.tables
                  where table_schema='public' and table_name='organizations')
      and not exists (select 1 from public.schema_migrations where filename='0001_init.sql')
    returning filename
  `)
  if (baselined.rows.length) console.log('• baselined 0001_init.sql (already applied)')

  const applied = new Set(
    (await client.query('select filename from public.schema_migrations')).rows.map((r) => r.filename),
  )

  for (const file of files) {
    const base = file.replace(/\\/g, '/').split('/').pop()
    const tracked = explicitFiles.length === 0 && isMigration(file)

    if (tracked && applied.has(base)) {
      console.log(`• skip ${file} (already applied)`)
      continue
    }

    const sql = readFileSync(file, 'utf8')
    process.stdout.write(`→ Applying ${file} … `)
    await client.query(sql)
    if (tracked) {
      await client.query('insert into public.schema_migrations (filename) values ($1) on conflict do nothing', [base])
    }
    console.log('done')
  }
  console.log('✓ All SQL applied successfully')
} catch (err) {
  console.error(`\n✗ Failed: ${err.message}`)
  process.exitCode = 1
} finally {
  await client.end()
}
