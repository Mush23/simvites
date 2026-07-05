import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { formatEventDateTime } from '@/lib/utils'

export const metadata = { title: 'RSVPs · Occasio' }

export default async function RsvpsPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()

  const [{ data: events }, { data: invitations }, { data: responses }, { data: guests }, { data: households }, { data: questions }, { data: answers }] =
    await Promise.all([
      supabase.from('events').select('id, name, starts_at, capacity').eq('site_id', site!.siteId)
        .is('archived_at', null).order('sort_order').order('starts_at'),
      supabase.from('invitations').select('guest_id, event_id').eq('site_id', site!.siteId),
      supabase.from('responses').select('guest_id, event_id, status, responded_at').eq('site_id', site!.siteId),
      supabase.from('guests').select('id, full_name, household_id').eq('site_id', site!.siteId).is('archived_at', null),
      supabase.from('households').select('id, name').eq('site_id', site!.siteId).is('archived_at', null),
      supabase.from('rsvp_questions').select('id, key, label, type, options').eq('site_id', site!.siteId).is('archived_at', null),
      supabase.from('rsvp_answers').select('guest_id, question_id, value').eq('site_id', site!.siteId),
    ])

  const guestById = new Map((guests ?? []).map((g) => [g.id, g]))
  const hhById = new Map((households ?? []).map((h) => [h.id, h.name]))

  const perEvent = (events ?? []).map((e) => {
    const invited = (invitations ?? []).filter((i) => i.event_id === e.id && guestById.has(i.guest_id))
    const resp = (responses ?? []).filter((r) => r.event_id === e.id && guestById.has(r.guest_id))
    const attending = resp.filter((r) => r.status === 'attending')
    const declined = resp.filter((r) => r.status === 'declined')
    return {
      ...e,
      invited: invited.length,
      attending: attending.length,
      declined: declined.length,
      pending: Math.max(0, invited.length - attending.length - declined.length),
      nonResponders: invited
        .filter((i) => !resp.some((r) => r.guest_id === i.guest_id))
        .map((i) => guestById.get(i.guest_id)!.full_name),
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
            <button type="submit" title="Email every household that hasn't responded, with a fresh personal link"
              className="bg-accent px-4 py-2 text-sm font-semibold text-white">
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
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'bad' | 'warn' }) {
  const toneClass = { ok: 'text-ok', bad: 'text-bad', warn: 'text-warn' }[tone]
  return (
    <div className="rounded-md bg-paper-2 py-3">
      <p className={`font-mono text-[22px] font-semibold tracking-tight nums ${toneClass}`}>{value}</p>
      <p className="eyebrow mt-1">{label}</p>
    </div>
  )
}
