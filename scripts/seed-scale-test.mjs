// Scale-test seed — 5 full, unique end-to-end wedding sites for load/QA.
//
// Builds one dedicated owner account + org with 5 published sites, each on a
// DIFFERENT template + backdrop so no two look alike. The flagship
// (aria-and-kabir) carries the headline scale: 150 households / 300+ guests,
// full invitation matrix, realistic RSVP progress, vendors/budget/payments/
// tasks, itineraries and a published Save-the-Date. The other four are smaller
// but complete. Everything freezes into a published_versions snapshot so the
// public sites render.
//
// Idempotent: wipes the "Scale Test Studio" org (cascade) and any site holding
// one of the 5 slugs before re-seeding.
//
// Usage: node --env-file=.env.local scripts/seed-scale-test.mjs

import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const pepper = process.env.TOKEN_PEPPER // optional — tokens skipped if unset
const admin = createClient(url, service, { auth: { persistSession: false } })

const OWNER_EMAIL = 'scale@milestones.test'
const OWNER_PW = 'ScaleTest2026!'
const ORG_NAME = 'Scale Test Studio'

const rand = (n) => Math.floor(Math.random() * n)
const pick = (arr) => arr[rand(arr.length)]
const chance = (p) => Math.random() < p
const iso = (d) => d.toISOString()
const dateStr = (d) => d.toISOString().slice(0, 10)
const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d }

async function chunkInsert(table, rows, size = 500) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await admin.from(table).insert(rows.slice(i, i + size))
    if (error) throw new Error(`${table}: ${error.message}`)
  }
}

// ── Name pools ───────────────────────────────────────────────────────────
const FIRST = ['Aisha','Rohan','Priya','Arjun','Meera','Kabir','Zoya','Dev','Anaya','Vikram','Sana','Imran','Nadia','Ethan','Layla','Sam','Riya','Karan','Isha','Neel','Tara','Aryan','Diya','Reyansh','Mira','Yusuf','Farah','Omar','Leela','Jay','Sara','Raj','Nina','Kian','Anjali','Rahul','Simran','Aditya','Kavya','Rehan','Maya','Dhruv','Ira','Ayaan','Nisha','Veer','Roshni','Zain','Aria','Ravi']
const SUR = ['Shah','Khan','Patel','Mehta','Kapoor','Singh','Iyer','Reddy','Desai','Malik','Gupta','Bose','Nair','Chopra','Rao','Sethi','Dalal','Kaur','Ahmed','Verma','Joshi','Bhatt','Menon','Sinha','Pillai','Anand','Chauhan','Datta','Grewal','Hussain','Lamba','Mirza','Naidu','Oberoi','Puri']
const SIDES = ['Bride', 'Groom', 'Both']
const DIETS = ['No nuts please', 'Vegetarian', 'Vegan', 'Halal', 'Gluten free', 'No shellfish', '']
const MEALS = ['Paneer', 'Lamb', 'Chicken', 'Fish', 'Vegan plate']

// ── Site blueprints (each unique: template + backdrop + events + copy) ─────
const homeDoc = (o) => ({
  root: { props: {} },
  content: [
    { type: 'Hero', props: { id: 'hero', kicker: o.kicker, title: o.names, subtitle: o.subtitle ?? '', dateText: o.dateText, location: o.location, imageUrl: '', overlay: 'balanced' } },
    { type: 'CountdownBlock', props: { id: 'countdown', heading: 'The countdown to forever', dateISO: o.ceremonyISO } },
    { type: 'StoryBlock', props: { id: 'story', kicker: 'Our Story', title: o.storyTitle, paragraphs: o.story.map((text) => ({ text })) } },
    { type: 'FamilyBlock', props: { id: 'family', heading: 'With the blessings of', sides: o.families } },
    { type: 'Schedule', props: { id: 'schedule', heading: 'The Celebrations' } },
    { type: 'GalleryBlock', props: { id: 'gallery', heading: 'Moments', images: [] } },
    { type: 'Faq', props: { id: 'faq', heading: 'Good to know', items: o.faq } },
    { type: 'HotelTravel', props: { id: 'hotel', heading: 'Stay & Travel', hotelName: o.hotel.name, address: o.hotel.address, blockCode: o.hotel.code, phone: o.hotel.phone, bookingUrl: o.hotel.url, notes: o.hotel.notes } },
    { type: 'RsvpCta', props: { id: 'rsvp', heading: 'Kindly RSVP', body: 'We can’t wait to celebrate with you.', buttonText: 'Open your invitation' } },
    { type: 'GiftsNote', props: { id: 'gifts', heading: o.gifts.heading, body: o.gifts.body } },
    { type: 'SiteFooterBlock', props: { id: 'footer', names: o.names, note: 'Made with Milestones' } },
  ],
})

const SITES = [
  {
    slug: 'aria-and-kabir', title: 'Aria & Kabir', template: 'midnight-baraat', backdrop: 'shimmer',
    initials: 'A & K', households: 150, palette: 'midnight',
    kicker: 'Together with their families', names: 'Aria & Kabir',
    dateText: '14 November 2026', location: 'London, UK', ceremonyISO: '2026-11-14T17:00:00Z',
    storyTitle: 'Under the same sky', story: ['We met on the last train out of King’s Cross, arguing over the last free seat.', 'Seven years, three cities and one very patient dog later, here we are.'],
    families: [{ side: 'The Groom', name: 'Kabir', parents: 'Son of Imran & Nadia' }, { side: 'The Bride', name: 'Aria', parents: 'Daughter of Vikram & Sana' }],
    faq: [{ q: 'What should I wear?', a: 'Festive Indian or formal Western. Bring dancing shoes for the Sangeet.' }, { q: 'Is there parking?', a: 'Valet at every venue. Details on your invitation.' }, { q: 'Can I bring my children?', a: 'The Nikah is family-wide; the after-party is adults only.' }],
    hotel: { name: 'The Landmark London', address: '222 Marylebone Rd', code: 'ARIAKABIR', phone: '+44 20 7631 8000', url: 'https://example.com/stay', notes: 'Rooms held until 1 October.' },
    gifts: { heading: 'Your presence is the present', body: 'No boxed gifts — your blessings mean the world. A honeymoon fund link is on your invite.' },
    events: [
      { name: 'Sangeet', days: 88, venue_name: 'Troxy', capacity: 320, visibility: 'invite_only', accent: '#D4AF6A', dress_code: 'Festive glam' },
      { name: 'Baraat & Nikah', days: 90, venue_name: 'Regent Street Cinema', capacity: 260, visibility: 'public', accent: '#EFE6D2', dress_code: 'Formal' },
      { name: 'Walima Reception', days: 90, venue_name: 'The Landmark Ballroom', capacity: 300, visibility: 'invite_only', accent: '#D4AF6A', dress_code: 'Black tie' },
      { name: 'Farewell Brunch', days: 91, venue_name: 'The Wallace Collection', capacity: 120, visibility: 'invite_only', accent: '#C6BBA2', dress_code: 'Smart casual' },
    ],
  },
  {
    slug: 'meera-and-jay', title: 'Meera & Jay', template: 'garden-mehndi', backdrop: 'petals',
    initials: 'M & J', households: 32, palette: 'sage',
    kicker: 'Come celebrate with us', names: 'Meera & Jay',
    dateText: '6 June 2026', location: 'Cotswolds, UK', ceremonyISO: '2026-06-06T11:00:00Z',
    storyTitle: 'A garden, a promise', story: ['It began with a shared umbrella at a farmers’ market and a punnet of strawberries.', 'We’re marrying where it started: under the open sky, among the roses.'],
    families: [{ side: 'The Groom', name: 'Jay', parents: 'Son of Raj & Nina' }, { side: 'The Bride', name: 'Meera', parents: 'Daughter of Anand & Leela' }],
    faq: [{ q: 'Is it outdoors?', a: 'Mostly — bring a light layer and flats for the lawn.' }, { q: 'Dietary needs?', a: 'Tell us on your RSVP; the kitchen is fully vegetarian.' }],
    hotel: { name: 'The Painswick', address: 'Kemps Ln, Painswick', code: 'MEERAJAY', phone: '+44 1452 813688', url: 'https://example.com/stay', notes: 'Shuttle runs from the village square.' },
    gifts: { heading: 'A note on gifts', body: 'We’re planting an orchard instead of a registry — a tree in your name is the loveliest gift.' },
    events: [
      { name: 'Haldi', days: 118, venue_name: 'The Walled Garden', capacity: 60, visibility: 'invite_only', accent: '#E8A33D', dress_code: 'Yellows, clothes you can stain' },
      { name: 'Mehndi', days: 119, venue_name: 'The Orangery', capacity: 90, visibility: 'invite_only', accent: '#7FA05F', dress_code: 'Garden festive' },
      { name: 'Wedding Ceremony', days: 120, venue_name: 'Painswick Rococo Garden', capacity: 140, visibility: 'public', accent: '#2E5339', dress_code: 'Garden formal' },
      { name: 'Sunday Brunch', days: 121, venue_name: 'The Painswick Terrace', capacity: 100, visibility: 'invite_only', accent: '#7FA05F', dress_code: 'Casual' },
    ],
  },
  {
    slug: 'zoya-and-arjun', title: 'Zoya & Arjun', template: 'rajwada', backdrop: 'none',
    initials: 'Z & A', households: 40, palette: 'template',
    kicker: 'A palace celebration', names: 'Zoya & Arjun',
    dateText: '19 December 2026', location: 'Udaipur, India', ceremonyISO: '2026-12-19T09:30:00Z',
    storyTitle: 'Written in the stars', story: ['Two families, one grand tradition, and a love that turned strangers into forever.', 'Join us for four days of colour, music and ceremony by the lake.'],
    families: [{ side: 'The Groom', name: 'Arjun', parents: 'Son of Oberoi & Roshni' }, { side: 'The Bride', name: 'Zoya', parents: 'Daughter of Mirza & Farah' }],
    faq: [{ q: 'Do I need a visa?', a: 'Yes — e-visas take ~3 days. We can send a formal invitation letter.' }, { q: 'What’s the weather?', a: 'Warm days, cool evenings. Bring a shawl for the lake.' }, { q: 'Transport?', a: 'Coaches run between the hotel and every venue.' }],
    hotel: { name: 'Taj Lake Palace', address: 'Pichola, Udaipur', code: 'ZOYAARJUN', phone: '+91 294 242 8800', url: 'https://example.com/stay', notes: 'Book by 1 November for the group rate.' },
    gifts: { heading: 'Blessings only', body: 'Your journey to be with us is the greatest gift of all.' },
    events: [
      { name: 'Ganesh Puja', days: 161, venue_name: 'Jag Mandir Courtyard', capacity: 120, visibility: 'invite_only', accent: '#E8A33D', dress_code: 'Traditional' },
      { name: 'Sangeet Night', days: 162, venue_name: 'Zenana Mahal', capacity: 220, visibility: 'invite_only', accent: '#F8EAD8', dress_code: 'Jewel tones' },
      { name: 'Pheras', days: 163, venue_name: 'Lake Palace Lawn', capacity: 180, visibility: 'public', accent: '#E8A33D', dress_code: 'Grand traditional' },
      { name: 'Reception Gala', days: 163, venue_name: 'The Grand Durbar Hall', capacity: 260, visibility: 'invite_only', accent: '#F8EAD8', dress_code: 'Black tie / heavy lehenga' },
    ],
  },
  {
    slug: 'layla-and-sam', title: 'Layla & Sam', template: 'coastline', backdrop: 'aurora',
    initials: 'L & S', households: 22, palette: 'ivory',
    kicker: 'Vows by the water', names: 'Layla & Sam',
    dateText: '12 September 2026', location: 'Amalfi Coast, Italy', ceremonyISO: '2026-09-12T16:30:00Z',
    storyTitle: 'Where the sea meets the sky', story: ['We fell in love on a ferry we nearly missed, sharing one pair of earphones.', 'So of course, we’re getting married by the water.'],
    families: [{ side: 'One half', name: 'Sam', parents: 'Child of Ethan & Maya' }, { side: 'The other', name: 'Layla', parents: 'Child of Yusuf & Nisha' }],
    faq: [{ q: 'How do I get there?', a: 'Fly to Naples, then a 90-minute transfer we’ll arrange.' }, { q: 'Shoes?', a: 'Wedges or flats — there are steps and cobblestones everywhere.' }],
    hotel: { name: 'Hotel Santa Caterina', address: 'SS163 Amalfitana, Amalfi', code: 'LAYLASAM', phone: '+39 089 871012', url: 'https://example.com/stay', notes: 'Limited rooms — reserve early.' },
    gifts: { heading: 'Gifts', body: 'Your being here, far from home, means everything. A honeymoon fund is linked on your invite.' },
    events: [
      { name: 'Welcome Aperitivo', days: 64, venue_name: 'Cliffside Terrace', capacity: 70, visibility: 'invite_only', accent: '#5B7485', dress_code: 'Resort chic' },
      { name: 'Beach Ceremony', days: 65, venue_name: 'Marina Grande', capacity: 90, visibility: 'public', accent: '#3E4E5C', dress_code: 'Coastal formal' },
      { name: 'Sunset Dinner', days: 65, venue_name: 'La Terrazza', capacity: 90, visibility: 'invite_only', accent: '#5B7485', dress_code: 'Evening elegant' },
    ],
  },
  {
    slug: 'nadia-and-ethan', title: 'Nadia & Ethan', template: 'deco-champagne', backdrop: 'mesh',
    initials: 'N & E', households: 28, palette: 'night',
    kicker: 'An evening to remember', names: 'Nadia & Ethan',
    dateText: '31 December 2026', location: 'New York, USA', ceremonyISO: '2026-12-31T18:00:00Z',
    storyTitle: 'A toast to us', story: ['We met at a New Year’s party neither of us wanted to attend.', 'Five years later we’re ringing in the new year as husband and wife.'],
    families: [{ side: 'The Groom', name: 'Ethan', parents: 'Son of Sam & Tara' }, { side: 'The Bride', name: 'Nadia', parents: 'Daughter of Zain & Ira' }],
    faq: [{ q: 'Dress code?', a: 'Great Gatsby black tie — sequins strongly encouraged.' }, { q: 'Midnight plans?', a: 'Champagne, a countdown and a rooftop firework view.' }],
    hotel: { name: 'The Plaza', address: '768 5th Ave, New York', code: 'NADIAETHAN', phone: '+1 212 759 3000', url: 'https://example.com/stay', notes: 'NYE rates held until 30 November.' },
    gifts: { heading: 'No gifts, please', body: 'Raise a glass with us — that’s all we ask. A charity link is on your invite if you insist.' },
    events: [
      { name: 'Cocktail Hour', days: 173, venue_name: 'The Rose Club', capacity: 110, visibility: 'invite_only', accent: '#E2C892', dress_code: 'Deco cocktail' },
      { name: 'Ceremony', days: 173, venue_name: 'The Grand Ballroom', capacity: 200, visibility: 'public', accent: '#F4ECDD', dress_code: 'Black tie' },
      { name: "New Year's Gala", days: 173, venue_name: 'The Plaza Rooftop', capacity: 220, visibility: 'invite_only', accent: '#E2C892', dress_code: 'Black tie glam' },
    ],
  },
]

const VENDOR_CATS = ['catering', 'photography', 'decor', 'dj', 'coordinator', 'florals', 'mehndi', 'transport']
const VSTATUS = ['booked', 'booked', 'quote_in', 'contacted', 'shortlisted', 'declined']

// ── Idempotent teardown ────────────────────────────────────────────────────
async function ownerId() {
  const { data: list } = await admin.auth.admin.listUsers()
  let u = list.users.find((x) => x.email === OWNER_EMAIL)
  if (!u) {
    const { data } = await admin.auth.admin.createUser({ email: OWNER_EMAIL, password: OWNER_PW, email_confirm: true })
    u = data.user
  }
  await admin.from('profiles').upsert({ id: u.id, email: OWNER_EMAIL, full_name: 'Scale Test Studio' })
  return u.id
}
const uid = await ownerId()

// Remove any prior sites holding our slugs (cascade), then the org.
for (const s of SITES) {
  const { data: ex } = await admin.from('sites').select('id, org_id').eq('slug', s.slug).maybeSingle()
  if (ex) await admin.from('organisations').delete().eq('id', ex.org_id)
}
const { data: orgs } = await admin.from('organisations').select('id').eq('name', ORG_NAME)
for (const o of orgs ?? []) await admin.from('organisations').delete().eq('id', o.id)

// ── Org + membership ────────────────────────────────────────────────────────
const { data: org, error: orgErr } = await admin.from('organisations').insert({ name: ORG_NAME }).select('id').single()
if (orgErr) throw orgErr
await admin.from('memberships').insert({ org_id: org.id, user_id: uid, role: 'owner' })

const totals = { households: 0, guests: 0, invitations: 0, responses: 0, answers: 0, tokens: 0 }
const report = []

for (const S of SITES) {
  // Site (flagship first → oldest → primary in-app). Unlocked so publish is clean.
  const { data: site, error: siteErr } = await admin.from('sites').insert({
    org_id: org.id, slug: S.slug, title: S.title,
    labels: { couple: S.names, guest: 'Guest', event: 'Event' },
    theme: { template: S.template, backdrop: S.backdrop, initials: S.initials, mode: 'system' },
    currency: S.slug === 'nadia-and-ethan' ? 'USD' : (S.slug === 'zoya-and-arjun' ? 'INR' : 'GBP'),
    is_unlocked: true, status: 'published',
  }).select('id').single()
  if (siteErr) throw siteErr
  const siteId = site.id

  // Events
  const eventRows = S.events.map((e, i) => {
    const start = daysFromNow(e.days); start.setHours(17, 0, 0, 0)
    return {
      site_id: siteId, name: e.name, starts_at: iso(start),
      venue_name: e.venue_name, capacity: e.capacity, visibility: e.visibility,
      accent: e.accent, dress_code: e.dress_code, sort_order: i, on_website: true,
      description: `Join us for the ${e.name}.`,
      rsvp_deadline: iso(daysFromNow(e.days - 21)),
    }
  })
  const { data: events, error: evErr } = await admin.from('events').insert(eventRows).select('id, name, starts_at')
  if (evErr) throw evErr
  const ceremony = events.find((e) => /ceremony|pheras|nikah|baraat/i.test(e.name)) ?? events[Math.min(1, events.length - 1)]
  const reception = events.find((e) => /reception|gala|walima|dinner/i.test(e.name)) ?? events[events.length - 1]

  // Home page — customised starter doc for this couple
  await admin.from('pages').insert({
    site_id: siteId, slug: 'home', title: 'Home', is_home: true, nav_order: 0,
    puck_data: homeDoc({ ...S, subtitle: '' }),
  })

  // RSVP questions: dietary (text, required, global) + meal choice (reception)
  const { data: qs } = await admin.from('rsvp_questions').insert([
    { site_id: siteId, key: 'dietary', label: 'Any dietary requirements?', type: 'text', required: true, options: [], sort_order: 0 },
    { site_id: siteId, key: 'meal', label: 'Main course choice', type: 'meal_choice', required: false, options: MEALS, sort_order: 1, event_id: reception.id },
  ]).select('id, key')
  const dietQ = qs.find((q) => q.key === 'dietary').id
  const mealQ = qs.find((q) => q.key === 'meal').id

  // Itinerary on ceremony + reception
  await admin.from('event_itinerary').insert([
    { site_id: siteId, event_id: ceremony.id, time_label: '4:30 pm', title: 'Guests seated', sort_order: 0 },
    { site_id: siteId, event_id: ceremony.id, time_label: '5:00 pm', title: 'Ceremony begins', sort_order: 1 },
    { site_id: siteId, event_id: ceremony.id, time_label: '5:45 pm', title: 'Blessings & photos', sort_order: 2 },
    { site_id: siteId, event_id: reception.id, time_label: '7:00 pm', title: 'Reception & dinner', sort_order: 0 },
    { site_id: siteId, event_id: reception.id, time_label: '9:00 pm', title: 'First dance', sort_order: 1 },
    { site_id: siteId, event_id: reception.id, time_label: '11:00 pm', title: 'Dance floor opens', sort_order: 2 },
  ])

  // ── Households + guests ──
  const householdRows = []
  for (let h = 0; h < S.households; h++) {
    householdRows.push({ site_id: siteId, name: `The ${pick(SUR)} Family`, side: pick(SIDES) })
  }
  const { data: households, error: hhErr } = await admin.from('households').insert(householdRows).select('id')
  if (hhErr) throw hhErr

  const guestRows = []
  for (const hh of households) {
    const size = chance(0.12) ? 1 : chance(0.55) ? 2 : chance(0.7) ? 3 : 4
    for (let g = 0; g < size; g++) {
      const isChild = g >= 2 && chance(0.4)
      guestRows.push({
        site_id: siteId, household_id: hh.id,
        full_name: `${pick(FIRST)} ${pick(SUR)}`,
        email: g === 0 ? `guest${totals.guests + guestRows.length}@example.com` : null,
        phone: g === 0 && chance(0.5) ? `+4477009${String(100000 + rand(899999)).slice(0, 6)}` : null,
        is_child: isChild,
      })
    }
  }
  const { data: guests, error: gErr } = await admin.from('guests').insert(guestRows).select('id, household_id')
  if (gErr) throw gErr

  // Group guests by household
  const guestsByHh = new Map()
  for (const g of guests) { const a = guestsByHh.get(g.household_id) ?? []; a.push(g); guestsByHh.set(g.household_id, a) }

  // ── Invitations: everyone to ceremony+reception; ~65% to the rest ──
  const inviteRows = []
  for (const g of guests) {
    for (const e of events) {
      const mustHave = e.id === ceremony.id || e.id === reception.id
      if (mustHave || chance(0.65)) inviteRows.push({ site_id: siteId, guest_id: g.id, event_id: e.id })
    }
  }
  await chunkInsert('invitations', inviteRows)
  const invitesByGuest = new Map()
  for (const inv of inviteRows) { const a = invitesByGuest.get(inv.guest_id) ?? []; a.push(inv.event_id); invitesByGuest.set(inv.guest_id, a) }

  // ── Responses: ~65% of households respond; per invited event ──
  const respRows = []
  const answerRows = []
  const respondedHh = new Set()
  for (const hh of households) {
    if (!chance(0.65)) continue
    respondedHh.add(hh.id)
    for (const g of guestsByHh.get(hh.id) ?? []) {
      const invited = invitesByGuest.get(g.id) ?? []
      const attends = chance(0.82)
      for (const evId of invited) {
        respRows.push({
          site_id: siteId, guest_id: g.id, event_id: evId,
          status: attends ? 'attending' : 'declined',
          responded_at: iso(daysFromNow(-rand(30))), responded_by: 'guest',
        })
      }
      if (attends) {
        answerRows.push({ site_id: siteId, guest_id: g.id, question_id: dietQ, value: JSON.stringify(pick(DIETS)) })
        if (invited.includes(reception.id)) answerRows.push({ site_id: siteId, guest_id: g.id, question_id: mealQ, value: JSON.stringify(pick(MEALS)) })
      }
    }
  }
  await chunkInsert('responses', respRows)
  await chunkInsert('rsvp_answers', answerRows)

  // ── Guest access tokens (for invitations page + readiness links_out) ──
  let tokenCount = 0
  if (pepper) {
    const tokRows = []
    for (const hh of households) {
      if (S.households > 100 ? true : chance(0.7)) {
        const raw = `${siteId}:${hh.id}:${Math.random()}`
        tokRows.push({ site_id: siteId, household_id: hh.id, token_hash: createHash('sha256').update(pepper + raw).digest('hex'), revoked: false })
      }
    }
    await chunkInsert('guest_access_tokens', tokRows)
    tokenCount = tokRows.length
  }

  // ── Vendors + budget + payments + tasks ──
  const vendorRows = VENDOR_CATS.slice(0, 6).map((cat, i) => ({
    site_id: siteId, name: `${pick(SUR)} ${cat[0].toUpperCase() + cat.slice(1)}`, category: cat,
    contact_name: `${pick(FIRST)} ${pick(SUR)}`, email: `${cat}@example.com`,
    status: VSTATUS[i % VSTATUS.length],
    quote_amount: (rand(40) + 10) * 100000, contracted_amount: i < 3 ? (rand(40) + 10) * 100000 : null,
  }))
  const { data: vendors } = await admin.from('vendors').insert(vendorRows).select('id, category, contracted_amount')

  const budgetRows = vendors.map((v, i) => {
    const est = (rand(40) + 10) * 100000
    return {
      site_id: siteId, vendor_id: v.id, event_id: events[i % events.length].id,
      category: v.category, label: `${v.category} — ${S.title}`,
      estimated_amount: est, paid_amount: i < 2 ? Math.floor(est / 2) : 0,
      status: i < 2 ? 'part_paid' : 'estimated',
      due_date: dateStr(daysFromNow(rand(60) - 10)),
    }
  })
  const { data: budget } = await admin.from('budget_items').insert(budgetRows).select('id, vendor_id')

  const payRows = []
  for (let i = 0; i < vendors.length; i++) {
    const bi = budget[i]
    payRows.push({
      site_id: siteId, vendor_id: vendors[i].id, budget_item_id: bi?.id ?? null,
      label: i % 2 ? 'Balance' : 'Deposit', amount: (rand(30) + 5) * 100000,
      due_date: dateStr(daysFromNow([-5, 4, 10, 30, 60, 90][i % 6])),
      status: i < 2 ? 'paid' : 'scheduled', paid_on: i < 2 ? dateStr(daysFromNow(-10)) : null,
      remind_days_before: 7,
    })
  }
  await admin.from('vendor_payments').insert(payRows)

  const taskRows = []
  const taskTitles = ['Confirm final headcount', 'Send menu tasting date', 'Book mehndi artist', 'Finalise seating plan', 'Order welcome bags', 'Confirm transport', 'Approve stationery proof', 'Pay photographer balance', 'Rehearsal walkthrough', 'Share timeline with vendors']
  for (let i = 0; i < taskTitles.length; i++) {
    taskRows.push({
      site_id: siteId, title: taskTitles[i],
      status: i < 3 ? 'done' : i < 5 ? 'in_progress' : 'todo',
      priority: ['low', 'normal', 'high'][i % 3],
      due_date: dateStr(daysFromNow([-8, -2, 5, 12, 25, 40, 55][i % 7])),
      event_id: events[i % events.length].id,
    })
  }
  await admin.from('tasks').insert(taskRows)

  // ── Save the Date (published, combines first two events) ──
  const stdToken = createHash('sha256').update(`std:${siteId}`).digest('base64url').slice(0, 16)
  await admin.from('save_the_dates').insert({
    site_id: siteId, share_token: stdToken, headline: 'Save the Date',
    names: S.names, message: 'We’re getting married!', date_text: S.dateText, location: S.location,
    palette: S.palette, event_ids: [events[0].id, ceremony.id], published: true,
  })

  // ── Publish snapshot (mirror lib/publish.ts) ──
  const { data: itin } = await admin.from('event_itinerary').select('event_id, time_label, title, note, sort_order').eq('site_id', siteId).order('sort_order')
  const itinByEvent = new Map()
  for (const it of itin ?? []) { const a = itinByEvent.get(it.event_id) ?? []; a.push({ time_label: it.time_label, title: it.title, note: it.note }); itinByEvent.set(it.event_id, a) }
  const { data: pubEvents } = await admin.from('events').select('id, name, starts_at, ends_at, venue_name, address, description, accent, visibility, on_website, sort_order').eq('site_id', siteId).is('archived_at', null).neq('visibility', 'hidden').eq('on_website', true).order('sort_order').order('starts_at')
  const { data: pubPages } = await admin.from('pages').select('slug, title, puck_data, is_home, nav_order, hidden').eq('site_id', siteId)
  const snapshot = {
    schema_version: 1, title: S.title, slug: S.slug,
    theme: { template: S.template, backdrop: S.backdrop, initials: S.initials, mode: 'system' },
    labels: { couple: S.names, guest: 'Guest', event: 'Event' },
    pages: pubPages ?? [],
    events: (pubEvents ?? []).map((e) => ({ ...e, itinerary: itinByEvent.get(e.id) ?? [] })),
  }
  const expiry = daysFromNow(540)
  await admin.from('published_versions').insert({ site_id: siteId, snapshot, summary: 'Scale-test seed', published_by: uid })
  await admin.from('sites').update({ expires_at: iso(expiry) }).eq('id', siteId)

  totals.households += households.length
  totals.guests += guests.length
  totals.invitations += inviteRows.length
  totals.responses += respRows.length
  totals.answers += answerRows.length
  totals.tokens += tokenCount
  report.push({ site: S.title, slug: S.slug, template: S.template, backdrop: S.backdrop, households: households.length, guests: guests.length, invited: inviteRows.length, responses: respRows.length, respondedHh: respondedHh.size })
}

console.log('\n✓ Scale-test seed complete\n')
console.log(`Owner: ${OWNER_EMAIL} / ${OWNER_PW}  (org "${ORG_NAME}", ${SITES.length} sites)\n`)
for (const r of report) {
  console.log(`• ${r.site.padEnd(18)} /s/${r.slug}`)
  console.log(`    ${r.template} + ${r.backdrop} · ${r.households} households · ${r.guests} guests · ${r.invited} invites · ${r.responses} responses (${r.respondedHh} hh replied)`)
}
console.log(`\nTOTAL: ${totals.households} households · ${totals.guests} guests · ${totals.invitations} invitations · ${totals.responses} responses · ${totals.answers} answers · ${totals.tokens} tokens`)
console.log(`Flagship: ${report[0].site} — ${report[0].households} households / ${report[0].guests} guests`)
