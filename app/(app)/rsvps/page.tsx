import { createClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetch-all'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { formatEventDateTime } from '@/lib/utils'
import { BRAND_NAME } from '@/lib/brand'

export const metadata = { title: `RSVPs · ${BRAND_NAME}` }

export default async function RsvpsPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()
  const siteId = site!.siteId

  // Paginate the sets that can exceed the 1000-row cap so counts stay correct
  // on large weddings (a truncated fetch would under-report invited/responses).
  const [{ data: events }, invitations, responses, guests, households, { data: questions }, answers] =
    await Promise.all([
      supabase.from('events').select('id, name, starts_at, capacity').eq('site_id', siteId)
        .is('archived_at', null).order('sort_order').order('starts_at'),
      fetchAll<{ guest_id: string; event_id: string }>(() =>
        supabase.from('invitations').select('guest_id, event_id').eq('site_id', siteId)),
      fetchAll<{ guest_id: string; event_id: string; status: string; responded_at: string | null; message: string | null }>(() =>
        supabase.from('responses').select('guest_id, event_id, status, responded_at, message').eq('site_id', siteId)),
      fetchAll<{ id: string; full_name: string; household_id: string }>(() =>
        supabase.from('guests').select('id, full_name, household_id').eq('site_id', siteId).is('archived_at', null)),
      fetchAll<{ id: string; name: string }>(() =>
        supabase.from('households').select('id, name').eq('site_id', siteId).is('archived_at', null)),
      supabase.from('rsvp_questions').select('id, key, label, type, options').eq('site_id', siteId).is('archived_at', null),
      fetchAll<{ guest_id: string; question_id: string; value: unknown }>(() =>
        supabase.from('rsvp_answers').select('guest_id, question_id, value').eq('site_id', siteId)),
    ])

  const guestById = new Map(guests.map((g) => [g.id, g]))
  const hhById = new Map(households.map((h) => [h.id, h.name]))

  // Precompute per-event invited/responder sets once (O(invites + responses))
  // instead of re-scanning inside the per-event map.
  const invitedByEvent = new Map<string, string[]>()
  for (const i of invitations) {
    if (!guestById.has(i.guest_id)) continue
    const arr = invitedByEvent.get(i.event_id) ?? []
    arr.push(i.guest_id)
    invitedByEvent.set(i.event_id, arr)
  }
  const respByEvent = new Map<string, { attending: number; declined: number; responders: Set<string> }>()
  for (const r of responses) {
    if (!guestById.has(r.guest_id)) continue
    const agg = respByEvent.get(r.event_id) ?? { attending: 0, declined: 0, responders: new Set<string>() }
    if (r.status === 'attending') agg.attending++
    else if (r.status === 'declined') agg.declined++
    agg.responders.add(r.guest_id)
    respByEvent.set(r.event_id, agg)
  }

  const perEvent = (events ?? []).map((e) => {
    const invited = invitedByEvent.get(e.id) ?? []
    const agg = respByEvent.get(e.id) ?? { attending: 0, declined: 0, responders: new Set<string>() }
    return {
      ...e,
      invited: invited.length,
      attending: agg.attending,
      declined: agg.declined,
      pending: Math.max(0, invited.length - agg.attending - agg.declined),
      nonResponders: invited
        .filter((gid) => !agg.responders.has(gid))
        .map((gid) => guestById.get(gid)!.full_name),
    }
  })

  // Answer roll-ups (dietary/meal summaries) for choice questions.
  const rollups = (questions ?? [])
    .filter((q) => ['single_choice', 'multi_choice', 'meal_choice', 'yes_no'].includes(q.type))
    .map((q) => {
      const counts = new Map<string, number>()
      for (const a of (answers ?? []).filter((x) => x.question_id === q.id && guestById.has(x.guest_id))) {
        const values = Array.isArray(a.value) ? (a.value as unknown[]) : [a.value]
        for (const v of values) {
          const k = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)
          counts.set(k, (counts.get(k) ?? 0) + 1)
        }
      }
      return { label: q.label, counts: [...counts.entries()] }
    })
    .filter((r) => r.counts.length > 0)

  const textAnswers = (questions ?? [])
    .filter((q) => q.type === 'text')
    .map((q) => ({
      label: q.label,
      entries: (answers ?? [])
        .filter((a) => a.question_id === q.id && guestById.has(a.guest_id) && a.value)
        .map((a) => ({ guest: guestById.get(a.guest_id)!.full_name, value: String(a.value) })),
    }))
    .filter((t) => t.entries.length > 0)

  const respondedHouseholds = new Set(
    (responses ?? []).map((r) => guestById.get(r.guest_id)?.household_id).filter(Boolean),
  )

  // Messages for the couple — one per household, newest wording wins (the
  // note rides on every response row of a submission, so dedupe by text).
  const messages: { household: string; message: string; at: string | null }[] = []
  const seenMessage = new Set<string>()
  for (const r of responses) {
    const msg = (r.message ?? '').trim()
    if (!msg) continue
    const hh = hhById.get(guestById.get(r.guest_id)?.household_id ?? '') ?? 'A guest'
    const key = `${hh}:${msg}`
    if (seenMessage.has(key)) continue
    seenMessage.add(key)
    messages.push({ household: hh, message: msg, at: r.responded_at })
  }
  messages.sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          eyebrow="RSVPs"
          title="Who's coming"
          description={`${respondedHouseholds.size} of ${hhById.size} households have responded.`}
        />
        <div className="flex flex-wrap gap-3">
          <form action={async () => { 'use server'; await (await import('./actions')).sendReminders() }}>
            {/* Outline, not a solid fill. This sat in a row of three actions all
                shouting at the same volume; RSVPs is a screen you come to read.
                Still the leading action of the group — accent border and ink,
                just not the page's one solid call to action. */}
            <button type="submit" title="Email every household that hasn't responded, with a fresh personal link"
              className="rounded-md border border-accent-line bg-transparent px-4 py-2 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-soft">
              Remind pending households
            </button>
          </form>
          <a href="/rsvps/export" className="rounded-md border border-line bg-paper-2 px-4 py-2 text-sm hover:border-accent">
            Export RSVPs (CSV)
          </a>
          <a href="/guests/export" className="rounded-md border border-line bg-paper-2 px-4 py-2 text-sm hover:border-accent">
            Export guests (CSV)
          </a>
        </div>
      </div>

      {/* Per-event roll-up */}
      <div className="grid gap-5 sm:grid-cols-2">
        {perEvent.map((e) => (
          <section key={e.id} className="rounded-card border border-line bg-surface p-6 shadow-card">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold tracking-tight text-ink">{e.name}</h2>
              <span className="font-mono text-[10px] text-ink-3">
                {formatEventDateTime(e.starts_at) ?? 'TBC'}
              </span>
            </div>
            {/* Segmented bar (overhaul): attending / declined / pending of invited */}
            {(() => {
              const total = Math.max(1, e.attending + e.declined + e.pending)
              return (
                <div className="mt-4">
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full bg-ok" style={{ width: `${(e.attending / total) * 100}%` }} />
                    <div className="h-full bg-bad" style={{ width: `${(e.declined / total) * 100}%` }} />
                    <div className="h-full bg-warn" style={{ width: `${(e.pending / total) * 100}%` }} />
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[12px]">
                    <span className="flex items-center gap-1.5 text-ink-2">
                      <span className="h-2 w-2 rounded-full bg-ok" />Attending <span className="font-mono font-semibold text-ink">{e.attending}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-ink-2">
                      <span className="h-2 w-2 rounded-full bg-bad" />Declined <span className="font-mono font-semibold text-ink">{e.declined}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-ink-2">
                      <span className="h-2 w-2 rounded-full bg-warn" />Pending <span className="font-mono font-semibold text-ink">{e.pending}</span>
                    </span>
                    {e.capacity != null && (
                      <span className="ml-auto font-mono text-[10.5px] text-ink-3">{e.attending}/{e.capacity} seats</span>
                    )}
                  </div>
                </div>
              )
            })()}
            {e.nonResponders.length > 0 && (
              <p className="mt-4 text-xs text-ink-3">
                <span className="eyebrow">Chase:</span> {e.nonResponders.slice(0, 6).join(', ')}
                {e.nonResponders.length > 6 && ` +${e.nonResponders.length - 6} more`}
              </p>
            )}
          </section>
        ))}
      </div>

      {/* Answer roll-ups */}
      {(rollups.length > 0 || textAnswers.length > 0) && (
        <div className="mt-10">
          <h2 className="mb-5 text-lg font-semibold tracking-tight text-ink">Answers</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {rollups.map((r) => (
              <section key={r.label} className="rounded-card border border-line bg-surface p-6 shadow-card">
                <p className="eyebrow mb-3">{r.label}</p>
                {r.counts.map(([k, n]) => (
                  <div key={k} className="flex items-baseline justify-between border-b border-line py-1.5 text-sm last:border-0">
                    <span className="text-ink">{k}</span>
                    <span className="font-mono text-base font-semibold nums text-ink">{n}</span>
                  </div>
                ))}
              </section>
            ))}
            {textAnswers.map((t) => (
              <section key={t.label} className="rounded-card border border-line bg-surface p-6 shadow-card">
                <p className="eyebrow mb-3">{t.label}</p>
                {t.entries.map((e, i) => (
                  <p key={i} className="border-b border-line py-1.5 text-sm text-ink-2 last:border-0">
                    <span className="text-ink">{e.guest}:</span> {e.value}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </div>
      )}

      {/* Messages for the couple — a guestbook by stealth (original-site port) */}
      {messages.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-5 text-lg font-semibold tracking-tight text-ink">
            Messages for you <span className="text-base font-normal text-ink-3">({messages.length})</span>
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {messages.map((m, i) => (
              <blockquote key={i} className="rounded-card border border-line bg-surface p-6 shadow-card">
                <p className="font-display text-[17px] leading-relaxed text-ink">“{m.message}”</p>
                <footer className="mt-3 flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-medium text-ink-2">— {m.household}</span>
                  {m.at && (
                    <span className="font-sans text-[12px] uppercase tracking-[0.1em] text-ink-3">
                      {new Date(m.at).toLocaleDateString('en-GB')}
                    </span>
                  )}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

