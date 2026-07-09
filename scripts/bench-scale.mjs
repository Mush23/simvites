// Benchmark the heavy read paths against the scale-test flagship, and surface
// bottlenecks: (A) raw Postgres EXPLAIN ANALYZE on the hot filtered queries
// (shows seq-scan vs index + planner time), (B) end-to-end timing of each
// page's real query bundle as an AUTHENTICATED user (RLS included), and
// (C) the JS transform cost of the guest-matrix mapping (current vs Map-based).
//
// Usage: node --env-file=.env.local scripts/bench-scale.mjs

import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(SUPA_URL, SERVICE, { auth: { persistSession: false } })

const FLAG_SLUG = 'aria-and-kabir'
const { data: siteRow } = await admin.from('sites').select('id').eq('slug', FLAG_SLUG).single()
const siteId = siteRow.id
console.log(`Flagship ${FLAG_SLUG} → ${siteId}\n`)

const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
async function time(fn, runs = 5) {
  const ts = []
  for (let i = 0; i < runs; i++) { const t = performance.now(); await fn(); ts.push(performance.now() - t) }
  return med(ts)
}

// ── (A) Raw Postgres EXPLAIN ANALYZE ───────────────────────────────────────
console.log('══ (A) Postgres EXPLAIN ANALYZE (raw, service role) ══\n')
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await c.connect()
const explains = {
  'households by site_id': `select id,name,side from households where site_id='${siteId}' and archived_at is null order by created_at`,
  'guests by site_id': `select id,household_id,full_name,email from guests where site_id='${siteId}' and archived_at is null order by created_at`,
  'invitations by site_id': `select guest_id,event_id from invitations where site_id='${siteId}'`,
  'responses agg by site_id': `select guest_id,event_id,status from responses where site_id='${siteId}'`,
  'vendors by site_id': `select id,status from vendors where site_id='${siteId}' and archived_at is null`,
  'rsvp_answers by site_id': `select guest_id,question_id,value from rsvp_answers where site_id='${siteId}'`,
  'event_itinerary by site_id': `select event_id,title from event_itinerary where site_id='${siteId}' order by sort_order`,
}
for (const [label, sql] of Object.entries(explains)) {
  const { rows } = await c.query(`explain (analyze, buffers, format json) ${sql}`)
  const plan = rows[0]['QUERY PLAN'][0].Plan
  const scan = (function find(p) { if (/Scan/.test(p['Node Type'])) return p['Node Type'] + (p['Relation Name'] ? ` on ${p['Relation Name']}` : ''); for (const ch of p.Plans ?? []) { const r = find(ch); if (r) return r } })(plan) || plan['Node Type']
  const seq = /Seq Scan/.test(JSON.stringify(plan))
  console.log(`${seq ? '⚠️ ' : '✅ '}${label.padEnd(28)} ${rows[0]['QUERY PLAN'][0]['Execution Time'].toFixed(2)}ms  [${scan}]`)
}
await c.end()

// ── (B) End-to-end as an authenticated user (RLS included) ──────────────────
console.log('\n══ (B) Page query bundles, authenticated + RLS (median of 5) ══\n')
const authed = createClient(SUPA_URL, ANON, { auth: { persistSession: false } })
const { error: signErr } = await authed.auth.signInWithPassword({ email: 'scale@simvites.test', password: 'ScaleTest2026!' })
if (signErr) { console.log('sign-in failed:', signErr.message); process.exit(1) }

// getPrimarySite would return the oldest accessible site; the flagship is first.
const guestsBundle = () => Promise.all([
  authed.from('events').select('id, name, accent, sort_order').eq('site_id', siteId).is('archived_at', null).order('sort_order').order('starts_at'),
  authed.from('households').select('id, name, side').eq('site_id', siteId).is('archived_at', null).order('created_at'),
  authed.from('guests').select('id, household_id, full_name, email, is_child, plus_one_allowed').eq('site_id', siteId).is('archived_at', null).order('created_at'),
  authed.from('invitations').select('guest_id, event_id').eq('site_id', siteId),
])
const rsvpsBundle = () => Promise.all([
  authed.from('events').select('id, name, starts_at, capacity').eq('site_id', siteId).is('archived_at', null).order('sort_order').order('starts_at'),
  authed.from('invitations').select('guest_id, event_id').eq('site_id', siteId),
  authed.from('responses').select('guest_id, event_id, status, responded_at').eq('site_id', siteId),
  authed.from('guests').select('id, full_name, household_id').eq('site_id', siteId).is('archived_at', null),
  authed.from('households').select('id, name').eq('site_id', siteId).is('archived_at', null),
  authed.from('rsvp_questions').select('id, key, label, type, options').eq('site_id', siteId).is('archived_at', null),
  authed.from('rsvp_answers').select('guest_id, question_id, value').eq('site_id', siteId),
])
const readinessBundle = () => Promise.all([
  authed.from('events').select('id, venue_name, starts_at').eq('site_id', siteId).is('archived_at', null),
  authed.from('guests').select('id, household_id').eq('site_id', siteId).is('archived_at', null),
  authed.from('invitations').select('guest_id').eq('site_id', siteId),
  authed.from('responses').select('guest_id, status').eq('site_id', siteId),
  authed.from('households').select('id').eq('site_id', siteId).is('archived_at', null),
  authed.from('vendors').select('id, status').eq('site_id', siteId).is('archived_at', null),
  authed.from('tasks').select('id, status, due_date').eq('site_id', siteId).is('archived_at', null),
  authed.from('budget_items').select('estimated_amount, actual_amount, paid_amount').eq('site_id', siteId).is('archived_at', null),
])

console.log(`Guests matrix bundle    ${(await time(guestsBundle)).toFixed(1)}ms`)
console.log(`RSVP dashboard bundle   ${(await time(rsvpsBundle)).toFixed(1)}ms`)
console.log(`Readiness bundle        ${(await time(readinessBundle)).toFixed(1)}ms`)

// ── (C) JS transform cost of the guest-matrix mapping ───────────────────────
console.log('\n══ (C) Guest-matrix transform cost (current O(n²) vs Map-based) ══\n')
const [{ data: households }, { data: guests }, { data: invitations }] = await Promise.all([
  admin.from('households').select('id, name, side').eq('site_id', siteId).is('archived_at', null).order('created_at'),
  admin.from('guests').select('id, household_id, full_name, email, is_child, plus_one_allowed').eq('site_id', siteId).is('archived_at', null).order('created_at'),
  admin.from('invitations').select('guest_id, event_id').eq('site_id', siteId),
])
console.log(`data: ${households.length} households · ${guests.length} guests · ${invitations.length} invitations`)

const currentMap = () => households.map((h) => ({
  ...h,
  guests: guests.filter((g) => g.household_id === h.id).map((g) => ({
    ...g, invitedEventIds: invitations.filter((i) => i.guest_id === g.id).map((i) => i.event_id),
  })),
}))
const fastMap = () => {
  const gByH = new Map(); for (const g of guests) { const a = gByH.get(g.household_id) ?? []; a.push(g); gByH.set(g.household_id, a) }
  const iByG = new Map(); for (const i of invitations) { const a = iByG.get(i.guest_id) ?? []; a.push(i.event_id); iByG.set(i.guest_id, a) }
  return households.map((h) => ({ ...h, guests: (gByH.get(h.id) ?? []).map((g) => ({ ...g, invitedEventIds: iByG.get(g.id) ?? [] })) }))
}
console.log(`current (nested filter)  ${(await time(currentMap, 11)).toFixed(2)}ms`)
console.log(`Map-based (grouped once) ${(await time(fastMap, 11)).toFixed(2)}ms`)

process.exit(0)
