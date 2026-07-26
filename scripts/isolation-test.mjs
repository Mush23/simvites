// 2-org tenant-isolation test (handoff 1A DoD).
// Sets up two orgs/sites owned by two users via the service role, then signs in
// AS user A (anon key, so RLS applies) and proves A cannot read or write B's rows.
//
// Usage: node --env-file=.env.local scripts/isolation-test.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !anon || !service) {
  console.error('✗ Missing Supabase env vars.')
  process.exit(1)
}

const admin = createClient(url, service, { auth: { persistSession: false } })
const rnd = Math.random().toString(36).slice(2, 8)
const pass = 'IsoTest!2026'
let failures = 0
const check = (label, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failures++
}

async function getOrCreateUser(email) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: pass, email_confirm: true })
  if (!error) return data.user.id
  // Already exists — find it.
  const { data: list } = await admin.auth.admin.listUsers()
  return list.users.find((u) => u.email === email)?.id
}

async function setupOrg(userId, label) {
  const { data: org } = await admin.from('organisations').insert({ name: `${label} org ${rnd}` }).select('id').single()
  await admin.from('memberships').insert({ org_id: org.id, user_id: userId, role: 'owner' })
  const { data: site } = await admin
    .from('sites')
    .insert({ org_id: org.id, slug: `${label}-${rnd}`, title: `${label} site` })
    .select('id')
    .single()
  return { orgId: org.id, siteId: site.id }
}

const emailA = `iso-a-${rnd}@simvites.test`
const emailB = `iso-b-${rnd}@simvites.test`

const userA = await getOrCreateUser(emailA)
const userB = await getOrCreateUser(emailB)
const a = await setupOrg(userA, 'A')
const b = await setupOrg(userB, 'B')

// Sign in as user A with the anon client → RLS enforced as A.
const clientA = createClient(url, anon, { auth: { persistSession: false } })
const { error: signErr } = await clientA.auth.signInWithPassword({ email: emailA, password: pass })
check('user A can sign in', !signErr)

// A sees its own site.
const ownSite = await clientA.from('sites').select('id').eq('id', a.siteId).maybeSingle()
check('A can read its OWN site', ownSite.data?.id === a.siteId)

// A cannot see B's site.
const bSite = await clientA.from('sites').select('id').eq('id', b.siteId).maybeSingle()
check('A canNOT read B\'s site (RLS)', !bSite.data)

// A listing all sites sees exactly 1 (its own).
const allSites = await clientA.from('sites').select('id')
check('A\'s site list contains only its own', (allSites.data?.length ?? 0) === 1 && allSites.data[0].id === a.siteId)

// A cannot update B's site (0 rows affected).
const upd = await clientA.from('sites').update({ title: 'hacked' }).eq('id', b.siteId).select('id')
check('A canNOT update B\'s site', (upd.data?.length ?? 0) === 0)

// A cannot insert a child row under B's site (RLS check blocks it).
const ins = await clientA.from('events').insert({ site_id: b.siteId, name: 'intruder' }).select('id')
check('A canNOT insert an event under B\'s site', !!ins.error || (ins.data?.length ?? 0) === 0)

// A cannot read B's org.
const bOrg = await clientA.from('organisations').select('id').eq('id', b.orgId).maybeSingle()
check('A canNOT read B\'s organisation', !bOrg.data)

// Cleanup.
await admin.from('organisations').delete().in('id', [a.orgId, b.orgId])
await admin.auth.admin.deleteUser(userA)
await admin.auth.admin.deleteUser(userB)

console.log(failures === 0 ? '\n✓ ISOLATION TEST PASSED' : `\n✗ ISOLATION TEST FAILED (${failures})`)
process.exit(failures === 0 ? 0 : 1)
