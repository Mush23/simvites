// Seed the "Aanya & Dev" demo workspace (handoff 1A DoD).
// Attaches to an owner account (default: the founder's email) so signing in
// shows a populated command centre. Idempotent: wipes any prior demo org first.
//
// Usage: node --env-file=.env.local scripts/seed-demo.mjs [owner-email]

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(url, service, { auth: { persistSession: false } })

const ownerEmail = process.argv[2] ?? 'maharshi.sim@hotmail.com'
const SLUG = 'aanya-and-dev'

// ── Resolve (or create) the owner auth user + profile ──
async function ownerId() {
  const { data: list } = await admin.auth.admin.listUsers()
  let u = list.users.find((x) => x.email === ownerEmail)
  if (!u) {
    const { data } = await admin.auth.admin.createUser({ email: ownerEmail, password: 'Milestones2026!', email_confirm: true })
    u = data.user
  }
  await admin.from('profiles').upsert({ id: u.id, email: ownerEmail, full_name: 'Demo Host' })
  return u.id
}

const uid = await ownerId()

// ── Idempotent: remove any prior demo org (cascades the site + children) ──
const { data: existing } = await admin.from('sites').select('org_id').eq('slug', SLUG).maybeSingle()
if (existing) await admin.from('organisations').delete().eq('id', existing.org_id)

// ── Org + membership + site + home page ──
const { data: org } = await admin.from('organisations').insert({ name: 'Aanya & Dev — planning' }).select('id').single()
await admin.from('memberships').insert({ org_id: org.id, user_id: uid, role: 'owner' })
const { data: site } = await admin
  .from('sites')
  .insert({
    org_id: org.id,
    slug: SLUG,
    title: 'Aanya & Dev',
    labels: { couple: 'Aanya & Dev', guest: 'Guest', event: 'Event' },
    theme: { accent: 'terracotta', mode: 'system' },
    currency: 'GBP',
  })
  .select('id')
  .single()
const siteId = site.id
await admin.from('pages').insert({ site_id: siteId, slug: 'home', title: 'Home', is_home: true, nav_order: 0 })

// ── Events ──
// ONE coherent wedding: Aanya & Dev, 19 September 2026, Manchester. Every
// surface must agree — the builder hero, the Save the Date, the template
// previews and the marketing mock all read from this same wedding. They used
// to disagree (Manchester in the builder and Events, Jaipur on the Save the
// Date and in the marketing mock), and that contradiction is the first thing
// visible in every screenshot and demo.
//
// `accent` is set explicitly, drawn from the --event-* ramp in globals.css.
// Nothing in the product asks a couple to pick an event colour yet, so an
// unseeded demo fell back to the ramp for every dot; seeding them means the
// demo shows the intended taxonomy rather than a default.
const eventDefs = [
  { name: 'Mehndi', starts_at: '2026-09-17T16:00:00Z', venue_name: 'The Garden Room', capacity: 80, visibility: 'invite_only', sort_order: 0, accent: '#B8891F' },
  { name: 'Sangeet', starts_at: '2026-09-18T19:00:00Z', venue_name: 'Royal Banqueting Hall', capacity: 250, visibility: 'invite_only', sort_order: 1, accent: '#3E62A8' },
  { name: 'Wedding Ceremony', starts_at: '2026-09-19T10:30:00Z', venue_name: 'Heaton Park Pavilion', capacity: 300, visibility: 'public', sort_order: 2, accent: '#A33B4E' },
  { name: 'Reception', starts_at: '2026-09-19T18:30:00Z', venue_name: 'Heaton Park Pavilion', capacity: 300, visibility: 'invite_only', sort_order: 3, accent: '#2C3E63' },
]
const { data: events } = await admin
  .from('events')
  .insert(eventDefs.map((e) => ({ ...e, site_id: siteId })))
  .select('id, name')
const evId = (n) => events.find((e) => e.name === n).id

// ── Households + guests ──
const { data: shah } = await admin.from('households').insert({ site_id: siteId, name: 'The Shah Family', side: 'Bride' }).select('id').single()
const { data: khan } = await admin.from('households').insert({ site_id: siteId, name: 'The Khan Family', side: 'Groom' }).select('id').single()
const { data: guests } = await admin
  .from('guests')
  .insert([
    { site_id: siteId, household_id: shah.id, full_name: 'Priya Shah', email: 'priya@example.com' },
    { site_id: siteId, household_id: shah.id, full_name: 'Raj Shah' },
    { site_id: siteId, household_id: khan.id, full_name: 'Sara Khan', email: 'sara@example.com' },
    { site_id: siteId, household_id: khan.id, full_name: 'Imran Khan' },
  ])
  .select('id, full_name')
const gId = (n) => guests.find((g) => g.full_name === n).id

// ── Invitations (guest × event) ──
const inviteRows = []
for (const g of guests) for (const e of events) inviteRows.push({ site_id: siteId, guest_id: g.id, event_id: e.id })
await admin.from('invitations').insert(inviteRows)

// ── A couple of responses for realism ──
await admin.from('responses').insert([
  { site_id: siteId, guest_id: gId('Priya Shah'), event_id: evId('Sangeet'), status: 'attending', responded_at: new Date().toISOString(), responded_by: 'guest' },
  { site_id: siteId, guest_id: gId('Sara Khan'), event_id: evId('Sangeet'), status: 'attending', responded_at: new Date().toISOString(), responded_by: 'guest' },
])

console.log(`✓ Seeded "Aanya & Dev" (site ${siteId}) for ${ownerEmail}`)
console.log(`  ${events.length} events · ${guests.length} guests · ${inviteRows.length} invitations`)
