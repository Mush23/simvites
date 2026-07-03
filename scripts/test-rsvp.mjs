// USP correctness suite — submit_response (per-event invitations + custom RSVP).
// These are the crown jewels; every edge case here is a real-world failure a
// customer never forgives (audit quality bar).
//
// Covers: invite-gating, resubmission, capacity, CONCURRENT capacity race,
// deadlines (event + site default), archived guests, required questions,
// wrong-event questions.
//
// Usage: node --env-file=.env.local scripts/test-rsvp.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !service) { console.error('✗ Missing Supabase env.'); process.exit(1) }

// The server invokes submit_response with the service role after token
// validation (handoff §5) — tests call it the same way, each RPC over its own
// HTTP request/transaction (true parallelism for the race test).
const db = createClient(url, service, { auth: { persistSession: false } })

const rnd = Math.random().toString(36).slice(2, 8)
let failures = 0
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${label}${ok || !detail ? '' : `  [${detail}]`}`)
  if (!ok) failures++
}
const expectError = (label, error, pattern) =>
  check(label, !!error && pattern.test(error.message), error?.message ?? 'no error raised')

/** Fail fast if a fixture insert errors — a broken fixture invalidates every assertion after it. */
function must(result, what) {
  if (result.error) {
    console.error(`✗ FIXTURE FAILED (${what}): ${result.error.message}`)
    process.exit(1)
  }
  return result.data
}

// ── Fixture ────────────────────────────────────────────────────────────────
const org = must(await db.from('organisations').insert({ name: `rsvp-test ${rnd}` }).select('id').single(), 'org')
const site = must(await db.from('sites')
  .insert({ org_id: org.id, slug: `rsvp-test-${rnd}`, title: 'RSVP test' }).select('id').single(), 'site')

const events = must(await db.from('events').insert([
  { site_id: site.id, name: 'Ceremony', capacity: null },
  { site_id: site.id, name: 'Dinner', capacity: 1 },              // tiny cap for race tests
  { site_id: site.id, name: 'Brunch', rsvp_deadline: '2020-01-01T00:00:00Z' }, // deadline long past
]).select('id, name'), 'events')
const ev = (n) => events.find((e) => e.name === n).id

const hh = must(await db.from('households').insert({ site_id: site.id, name: 'Testers' }).select('id').single(), 'household')
const guests = must(await db.from('guests').insert([
  { site_id: site.id, household_id: hh.id, full_name: 'Alice' },
  { site_id: site.id, household_id: hh.id, full_name: 'Bob' },
  { site_id: site.id, household_id: hh.id, full_name: 'Cara' },
  { site_id: site.id, household_id: hh.id, full_name: 'Zed (archived)', archived_at: new Date().toISOString() },
]).select('id, full_name'), 'guests')
const g = (n) => guests.find((x) => x.full_name.startsWith(n)).id

// Invitations: Alice+Bob+Cara+Zed → Ceremony & Dinner & Brunch, EXCEPT Cara not invited to Ceremony.
const inviteRows = []
for (const guest of guests)
  for (const e of events)
    if (!(guest.full_name === 'Cara' && e.name === 'Ceremony'))
      inviteRows.push({ site_id: site.id, guest_id: guest.id, event_id: e.id })
must(await db.from('invitations').insert(inviteRows).select('id'), 'invitations')

// Questions: one required global (dietary), one per-event (Dinner meal), one conditional.
const questions = must(await db.from('rsvp_questions').insert([
  { site_id: site.id, key: 'dietary', label: 'Dietary requirements', type: 'text', required: true, options: [] },
  { site_id: site.id, key: 'meal', label: 'Meal choice', type: 'meal_choice', required: false, options: ['Paneer', 'Chicken'], event_id: ev('Dinner') },
  { site_id: site.id, key: 'song', label: 'Song request', type: 'text', required: true, options: [], show_if: { question_key: 'dietary', equals: 'anything' } },
]).select('id, key'), 'questions')
const q = (k) => questions.find((x) => x.key === k).id

const rpc = (args) => db.rpc('submit_response', args)

// ── 1 · Invite gating (USP #2) ────────────────────────────────────────────
{
  const { error } = await rpc({ p_guest: g('Cara'), p_event: ev('Ceremony'), p_status: 'attending', p_answers: [{ question_id: q('dietary'), value: 'none' }] })
  expectError('uninvited guest CANNOT respond to that event', error, /not invited/)
}
{
  const { error } = await rpc({ p_guest: g('Alice'), p_event: ev('Ceremony'), p_status: 'attending', p_answers: [{ question_id: q('dietary'), value: 'vegetarian' }] })
  check('invited guest CAN attend (with required answer)', !error, error?.message)
}

// ── 2 · Resubmission is an update, not a duplicate ────────────────────────
{
  const { error } = await rpc({ p_guest: g('Alice'), p_event: ev('Ceremony'), p_status: 'declined' })
  const { data } = await db.from('responses').select('status').eq('guest_id', g('Alice')).eq('event_id', ev('Ceremony'))
  check('resubmission updates the single row', !error && data.length === 1 && data[0].status === 'declined',
    error?.message ?? `rows=${data?.length} status=${data?.[0]?.status}`)
}

// ── 3 · Capacity (sequential) ─────────────────────────────────────────────
{
  const a = await rpc({ p_guest: g('Alice'), p_event: ev('Dinner'), p_status: 'attending', p_answers: [{ question_id: q('dietary'), value: 'veg' }, { question_id: q('meal'), value: 'Paneer' }] })
  check('first guest fills capacity-1 event', !a.error, a.error?.message)
  const b = await rpc({ p_guest: g('Bob'), p_event: ev('Dinner'), p_status: 'attending', p_answers: [{ question_id: q('dietary'), value: 'none' }] })
  expectError('second guest over capacity is rejected', b.error, /event full/)
  const d = await rpc({ p_guest: g('Bob'), p_event: ev('Dinner'), p_status: 'declined' })
  check('declining a full event is still allowed', !d.error, d.error?.message)
}

// ── 4 · CONCURRENT capacity race (the audit's #1 finding) ────────────────
{
  // Fresh cap-1 event; Bob and Cara race for the last seat in parallel.
  const raceEv = must(await db.from('events').insert({ site_id: site.id, name: 'Race', capacity: 1 }).select('id').single(), 'race event')
  await db.from('invitations').insert([
    { site_id: site.id, guest_id: g('Bob'), event_id: raceEv.id },
    { site_id: site.id, guest_id: g('Cara'), event_id: raceEv.id },
  ])
  const payload = (guest) => ({ p_guest: guest, p_event: raceEv.id, p_status: 'attending', p_answers: [{ question_id: q('dietary'), value: 'x' }] })
  const [r1, r2] = await Promise.all([rpc(payload(g('Bob'))), rpc(payload(g('Cara')))])
  const successes = [r1, r2].filter((r) => !r.error).length
  const fulls = [r1, r2].filter((r) => r.error && /event full/.test(r.error.message)).length
  const { count } = await db.from('responses').select('id', { count: 'exact', head: true }).eq('event_id', raceEv.id).eq('status', 'attending')
  check('PARALLEL race: exactly one wins, one gets "event full", attendee count = 1',
    successes === 1 && fulls === 1 && count === 1, `successes=${successes} fulls=${fulls} count=${count}`)
}

// ── 5 · Deadlines ─────────────────────────────────────────────────────────
{
  const { error } = await rpc({ p_guest: g('Alice'), p_event: ev('Brunch'), p_status: 'attending', p_answers: [{ question_id: q('dietary'), value: 'v' }] })
  expectError('event-level deadline passed → read-only', error, /deadline passed/)
}
{
  // Site default applies when the event has no own deadline.
  await db.from('sites').update({ rsvp_deadline_default: '2020-01-01T00:00:00Z' }).eq('id', site.id)
  const { error } = await rpc({ p_guest: g('Alice'), p_event: ev('Ceremony'), p_status: 'attending' })
  expectError('site-default deadline passed → read-only', error, /deadline passed/)
  await db.from('sites').update({ rsvp_deadline_default: null }).eq('id', site.id)
}

// ── 6 · Archived guests cannot respond ────────────────────────────────────
{
  const { error } = await rpc({ p_guest: g('Zed'), p_event: ev('Ceremony'), p_status: 'attending' })
  expectError('archived guest is rejected', error, /guest not found/)
}

// ── 7 · Custom questions (USP #1) ─────────────────────────────────────────
// Use a FRESH guest — site-wide questions are answered once per wedding, so a
// guest who answered earlier (e.g. in the race test) is legitimately satisfied.
const dana = must(await db.from('guests')
  .insert({ site_id: site.id, household_id: hh.id, full_name: 'Dana' }).select('id').single(), 'guest dana')
must(await db.from('invitations')
  .insert({ site_id: site.id, guest_id: dana.id, event_id: ev('Ceremony') }).select('id'), 'dana invite')
{
  const { error } = await rpc({ p_guest: dana.id, p_event: ev('Ceremony'), p_status: 'attending' })
  expectError('attending without required answer → rejected', error, /missing required answers/)
}
{
  const { error } = await rpc({ p_guest: dana.id, p_event: ev('Ceremony'), p_status: 'attending', p_answers: [{ question_id: q('dietary'), value: 'halal' }] })
  const { data } = await db.from('rsvp_answers').select('value').eq('guest_id', dana.id).eq('question_id', q('dietary'))
  check('required answer stored + attend succeeds', !error && data?.[0]?.value === 'halal', error?.message ?? JSON.stringify(data))
}
{
  // Dinner-scoped meal question cannot be answered against Ceremony.
  const { error } = await rpc({ p_guest: g('Bob'), p_event: ev('Ceremony'), p_status: 'attending', p_answers: [{ question_id: q('meal'), value: 'Paneer' }] })
  expectError('event-scoped question rejected on wrong event', error, /not for this event/)
}
{
  // Conditional (show_if) required question is NOT hard-enforced (evaluated in the 1C flow).
  const { error } = await rpc({ p_guest: g('Cara'), p_event: ev('Dinner'), p_status: 'declined' })
  check('conditional required question does not block (declined submit ok)', !error, error?.message)
}

// ── Cleanup ───────────────────────────────────────────────────────────────
await db.from('organisations').delete().eq('id', org.id)

console.log(failures === 0 ? '\n✓ RSVP USP SUITE PASSED' : `\n✗ RSVP USP SUITE FAILED (${failures})`)
process.exit(failures === 0 ? 0 : 1)
