'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import type { GuestRsvpContext, GuestEventView, GuestView, QuestionView } from '@/lib/guest-rsvp'
import { formatEventDateTime } from '@/lib/utils'
import { BRAND_NAME } from '@/lib/brand'
import { submitGuestRsvp, type GuestSubmission } from './actions'

// The money path. Mobile-first: big tap targets, minimal typing, clear
// progress, instant confirmation (audit UI/UX standards).

type Status = 'pending' | 'attending' | 'declined'

/** 3c: a required question someone skipped — the error lives AT the
 * question; the sticky bar only counts and jumps. */
interface MissingAnswer {
  guestId: string
  questionId: string
  anchor: string
  message: string
}

export function RsvpFlow({ ctx, brand }: {
  ctx: GuestRsvpContext
  /** Brand kit from the site theme — the keepsake wears the couple's monogram. */
  brand?: { initials?: string; monogram?: string }
}) {
  // choice state: guestId:eventId → status
  const [choices, setChoices] = useState<Record<string, Status>>(() => {
    const m: Record<string, Status> = {}
    for (const g of ctx.guests) for (const e of g.events) m[`${g.guestId}:${e.eventId}`] = e.status
    return m
  })
  // answers: guestId → questionId → value
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>(ctx.answers)
  const [phase, setPhase] = useState<'form' | 'submitting' | 'done'>('form')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [topError, setTopError] = useState<string | null>(null)
  // 3c: gaps only start showing once Send has been tapped with gaps open.
  const [showGaps, setShowGaps] = useState(false)
  // A message for the couple — optional, household-level (original-site port).
  const [note, setNote] = useState('')

  const anyAttending = (guestId: string) =>
    Object.entries(choices).some(([k, v]) => k.startsWith(`${guestId}:`) && v === 'attending')

  /** Household "yes" count for one event — checked against its allocation. */
  const attendingCount = (eventId: string) =>
    ctx.guests.filter((g) => choices[`${g.guestId}:${eventId}`] === 'attending').length

  const visibleQuestions = (guestId: string, scope: 'global' | string): QuestionView[] =>
    ctx.questions.filter((q) => {
      if (scope === 'global' ? q.eventId !== null : q.eventId !== scope) return false
      if (!q.showIf) return true
      const dep = ctx.questions.find((x) => x.key === q.showIf!.question_key)
      if (!dep) return true
      return (answers[guestId]?.[dep.id] ?? null) === q.showIf.equals
    })

  const missing = useMemo<MissingAnswer[]>(() => {
    const out: MissingAnswer[] = []
    for (const g of ctx.guests) {
      if (!anyAttending(g.guestId)) continue
      const first = g.fullName.split(' ')[0]
      for (const q of ctx.questions) {
        if (!q.required || q.showIf) continue
        const scoped = q.eventId === null
          ? true
          : choices[`${g.guestId}:${q.eventId}`] === 'attending'
        if (!scoped) continue
        const v = answers[g.guestId]?.[q.id]
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
          out.push({
            guestId: g.guestId,
            questionId: q.id,
            anchor: `q-${g.guestId}-${q.id}`,
            message: q.type === 'meal_choice'
              ? `Choose a meal for ${first} — the caterer needs it`
              : q.type === 'text'
                ? `A quick word for ${first} — your hosts need this one`
                : `Answer this for ${first} — your hosts need it`,
          })
        }
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choices, answers, ctx])
  const missingByKey = useMemo(
    () => new Map(missing.map((m) => [`${m.guestId}:${m.questionId}`, m])),
    [missing])

  const jumpToFirstGap = () => {
    document.getElementById(missing[0]?.anchor ?? '')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function onSubmit() {
    setTopError(null)
    // Send never scolds: with gaps open, it lights them up and scrolls there.
    if (missing.length) {
      setShowGaps(true)
      jumpToFirstGap()
      return
    }
    const submissions: GuestSubmission[] = ctx.guests.map((g) => ({
      guestId: g.guestId,
      choices: g.events
        .filter((e) => !e.deadlinePassed)
        .map((e) => ({ eventId: e.eventId, status: choices[`${g.guestId}:${e.eventId}`] }))
        .filter((c): c is { eventId: string; status: 'attending' | 'declined' } => c.status !== 'pending'),
      answers: answers[g.guestId] ?? {},
    })).filter((s) => s.choices.length > 0)

    if (!submissions.length) {
      setTopError('Choose attending or declining for at least one event.')
      return
    }

    setPhase('submitting')
    const res = await submitGuestRsvp(submissions, note)
    if (res.eventErrors && Object.keys(res.eventErrors).length) {
      setErrors(res.eventErrors)
      setTopError('Some responses could not be saved — see the notes below.')
      setPhase('form')
    } else if (res.error) {
      setTopError(res.error)
      setPhase('form')
    } else {
      setPhase('done')
    }
  }

  if (phase === 'done') {
    // 3b: the keepsake — the confirmation borrows the invitation's own
    // geometry (monogram, hairlines, serif, sharp corners) so saying yes
    // feels like receiving stationery, not submitting a form.
    const eventRows = ctx.guests
      .flatMap((g) => g.events)
      .filter((e, i, arr) => arr.findIndex((x) => x.eventId === e.eventId) === i)
      .map((e) => {
        const invitedGuests = ctx.guests.filter((g) => g.events.some((x) => x.eventId === e.eventId))
        const going = invitedGuests.filter((g) => choices[`${g.guestId}:${e.eventId}`] === 'attending').length
        const answered = invitedGuests.some((g) => choices[`${g.guestId}:${e.eventId}`] !== 'pending')
        return { ...e, going, invitedCount: invitedGuests.length, answered }
      })
      .filter((e) => e.answered)
    const anyoneComing = eventRows.some((e) => e.going > 0)
    const attendingEvents = eventRows.filter((e) => e.going > 0 && e.startsAt)

    // The family's whole weekend in two quiet lines: meals, then tables.
    const mealQs = ctx.questions.filter((q) => q.type === 'meal_choice')
    const mealLine = ctx.guests
      .map((g) => {
        const v = mealQs.map((q) => answers[g.guestId]?.[q.id]).find((x) => typeof x === 'string' && x)
        return v ? `${g.fullName.split(' ')[0]} — ${v}` : null
      })
      .filter(Boolean)
      .join(' · ')
    const tableLine = [...new Set(ctx.guests.map((g) => g.tableName).filter(Boolean))].join(' · ')

    const initials = brand?.initials?.trim() ||
      ctx.siteTitle.split(/\s*(?:&|\+|\band\b)\s*/i).map((s) => s.trim()[0]).filter(Boolean).slice(0, 2).join('·').toUpperCase()
    const savedOn = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    const onPdf = async () => {
      const { downloadRsvpPdf } = await import('@/lib/rsvp-pdf')
      await downloadRsvpPdf({
        siteTitle: ctx.siteTitle,
        householdName: ctx.householdName,
        siteUrl: window.location.href,
        lines: ctx.guests.map((g) => ({
          guest: g.fullName,
          events: g.events
            .map((e) => ({ name: e.name, status: choices[`${g.guestId}:${e.eventId}`] }))
            .filter((e): e is { name: string; status: 'attending' | 'declined' } => e.status !== 'pending'),
        })).filter((l) => l.events.length > 0),
      })
    }

    const onWhatsApp = () => {
      const siteUrl = window.location.href.split('/rsvp')[0]
      const text = encodeURIComponent(
        anyoneComing
          ? `We're in! Our RSVP for ${ctx.siteTitle} is sent 🎉 ${siteUrl}`
          : `Our RSVP for ${ctx.siteTitle} is sent. ${siteUrl}`,
      )
      window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener')
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-2 px-5 py-10 text-ink">
        <div className="w-full max-w-[400px]">
          <div className="border border-accent-line bg-paper px-6 py-8 text-center shadow-lift">
            {brand?.monogram ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.monogram} alt=""
                className="mx-auto h-[46px] w-[46px] rounded-full border border-accent-line object-cover" />
            ) : (
              <span className="mx-auto flex h-[46px] w-[46px] items-center justify-center rounded-full border border-accent-line font-display text-[15px] text-accent-ink">
                {initials}
              </span>
            )}
            <div aria-hidden className="mx-auto mt-3.5 h-px w-14 bg-accent-line" />
            <h1 className="mt-3.5 font-display text-[27px] leading-[1.15]">
              {anyoneComing
                ? <>With joy —<br />{ctx.householdName} are coming.</>
                : <>Thank you —<br />you&rsquo;ll be missed.</>}
            </h1>
            <p className="mt-2.5 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-3">Saved · {savedOn}</p>

            {eventRows.length > 0 && (
              <div className="mt-4 flex flex-col text-left">
                {eventRows.map((e) => (
                  <div key={e.eventId} className="flex items-center gap-2.5 border-t border-line px-0.5 py-2.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.accent ?? 'var(--accent)' }} />
                    <span className="min-w-0">
                      <span className="block truncate font-display text-[16px] leading-tight text-ink">{e.name}</span>
                      <span className="block font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
                        {formatEventDateTime(e.startsAt) ?? 'Date TBC'}
                      </span>
                    </span>
                    <span className={`ml-auto shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-medium ${
                      e.going > 0 ? 'bg-accent-soft text-accent-ink' : 'border border-line-2 text-ink-2'}`}>
                      {e.going === 0 ? 'Can’t make it'
                        : e.going === e.invitedCount ? 'Going ✓'
                        : `${e.going} of ${e.invitedCount} going`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {(mealLine || tableLine) && (
              <p className="mt-3.5 text-[12px] leading-relaxed text-ink-2">
                {mealLine}{mealLine && tableLine ? <br /> : null}{tableLine}
              </p>
            )}
            {note.trim() && (
              <p className="mt-2.5 text-[11.5px] italic text-ink-3">
                Your message is on its way to {ctx.siteTitle} ✓
              </p>
            )}

            <div aria-hidden className="mx-auto mt-4 h-px w-14 bg-accent-line" />
            <button type="button" onClick={onPdf}
              className="mt-4 w-full rounded-pill border-[1.5px] border-accent-line bg-transparent py-3 text-[12.5px] font-medium uppercase tracking-[0.04em] text-ink transition-colors hover:border-accent">
              Save your keepsake (PDF)
            </button>
            <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px]">
              {attendingEvents.length > 0 && (
                <a href="#keepsake-calendar" className="text-accent-ink hover:underline">Calendar</a>
              )}
              <button type="button" onClick={onWhatsApp}
                className="rounded-md text-accent-ink hover:underline">Share on WhatsApp</button>
              <button type="button" onClick={() => setPhase('form')}
                className="rounded-md text-accent-ink hover:underline">Change answers</button>
            </p>
          </div>
          <p className="mt-3 text-center font-mono text-[8.5px] uppercase tracking-[0.18em] text-ink-3">
            Made with {BRAND_NAME}
          </p>

          {attendingEvents.length > 0 && (
            <div id="keepsake-calendar" className="mt-6 scroll-mt-6">
              <p className="eyebrow mb-2 text-center">Add to your calendar</p>
              {attendingEvents.map((e) => (
                <CalendarRow key={e.eventId} name={e.name} startsAt={e.startsAt!} venue={e.venueName} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 3c: the question wears its own gap — ring, soft fill, and a reason in
  // plain words. Rendered via a helper (not an inline component) so text
  // inputs keep focus across re-renders.
  const renderQuestion = (g: GuestView, q: QuestionView) => {
    const gap = showGaps ? missingByKey.get(`${g.guestId}:${q.id}`) : undefined
    return (
      <div key={q.id} id={`q-${g.guestId}-${q.id}`}
        className={`scroll-mt-24 ${gap ? 'mb-4 rounded-card border-[1.5px] border-accent bg-accent-soft p-3 [&>*:first-child]:mb-0' : ''}`}>
        <QuestionField q={q}
          value={answers[g.guestId]?.[q.id]}
          onChange={(v) => setAnswers((a) => ({ ...a, [g.guestId]: { ...(a[g.guestId] ?? {}), [q.id]: v } }))} />
        {gap && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-accent-ink">
            <CircleAlert size={13} strokeWidth={2} className="shrink-0" /> {gap.message}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper pb-28 text-ink">
      <main className="mx-auto max-w-xl px-5 pt-14">
        <p className="eyebrow mb-3 text-center">{ctx.siteTitle}</p>
        <h1 className="text-center font-display text-4xl sm:text-5xl">
          Welcome, {ctx.householdName}
        </h1>
        <p className="mt-4 text-center text-ink-2">
          {ctx.allDeadlinesPassed
            ? 'The RSVP window has closed — here are the responses we have for you.'
            : 'Tell us who’s coming to each celebration.'}
        </p>

        <div className="mt-10 space-y-8">
          {ctx.guests.map((g) => (
            <section key={g.guestId} className="rounded-card border border-line bg-surface p-5 shadow-card">
              <h2 className="font-display text-2xl">
                {g.fullName}
                {g.isChild && <span className="ml-2 font-mono text-[10px] uppercase text-ink-3">child</span>}
              </h2>
              {g.tableName && (
                <p className="mt-1 inline-block rounded-pill px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-ink"
                  style={{ background: 'var(--accent-soft)' }}>
                  Your table: {g.tableName}
                </p>
              )}

              {g.events.length === 0 && (
                <p className="mt-3 text-sm text-ink-3">No events to respond to.</p>
              )}

              <div className="mt-4 space-y-4">
                {g.events.map((e) => (
                  <EventChoiceRow
                    key={e.eventId}
                    event={e}
                    status={choices[`${g.guestId}:${e.eventId}`]}
                    error={errors[`${g.guestId}:${e.eventId}`]}
                    limit={ctx.eventLimits[e.eventId]}
                    limitReached={
                      ctx.eventLimits[e.eventId] !== undefined &&
                      attendingCount(e.eventId) >= ctx.eventLimits[e.eventId]
                    }
                    onChange={(s) => setChoices((c) => ({ ...c, [`${g.guestId}:${e.eventId}`]: s }))}
                  />
                ))}
              </div>

              {/* Per-event questions when attending that event */}
              {g.events.filter((e) => choices[`${g.guestId}:${e.eventId}`] === 'attending').map((e) => {
                const qs = visibleQuestions(g.guestId, e.eventId)
                if (!qs.length) return null
                return (
                  <div key={e.eventId} className="mt-5 border-t border-line pt-4">
                    <p className="eyebrow mb-3">{e.name}</p>
                    {qs.map((q) => renderQuestion(g, q))}
                  </div>
                )
              })}

              {/* Wedding-wide questions once the guest attends anything */}
              {anyAttending(g.guestId) && visibleQuestions(g.guestId, 'global').length > 0 && (
                <div className="mt-5 border-t border-line pt-4">
                  <p className="eyebrow mb-3">A few details</p>
                  {visibleQuestions(g.guestId, 'global').map((q) => renderQuestion(g, q))}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* A message for the couple — optional, travels with the RSVP */}
        {!ctx.allDeadlinesPassed && (
          <label className="mt-8 block rounded-card border border-line bg-surface p-5 shadow-card">
            <span className="mb-1.5 block text-sm font-medium text-ink">
              A message for {ctx.siteTitle} <span className="text-xs font-normal text-ink-3">(optional)</span>
            </span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000}
              placeholder="A blessing, a memory, a joke — they read every one."
              className="w-full rounded-md border border-line bg-paper-2 px-3.5 py-2.5 text-ink outline-none focus:border-accent" />
          </label>
        )}
      </main>

      {/* Sticky bar: counts and jumps — never truncates, never scolds (3c) */}
      {!ctx.allDeadlinesPassed && (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/95 px-5 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            {showGaps && missing.length > 0 ? (
              <button type="button" onClick={jumpToFirstGap}
                className="flex min-w-0 flex-1 items-center gap-2 text-left text-[12.5px] font-semibold text-accent-ink">
                <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-pill bg-accent px-1 font-mono text-[10px] font-bold text-white nums">
                  {missing.length}
                </span>
                {missing.length === 1 ? 'answer needed' : 'answers needed'} ↑
              </button>
            ) : (
              <p className="min-w-0 flex-1 text-sm text-ink-3">
                {topError ? <span className="text-bad">{topError}</span> : 'You can change your answers any time before the deadline.'}
              </p>
            )}
            <button
              type="button"
              onClick={onSubmit}
              disabled={phase === 'submitting'}
              className="min-h-12 shrink-0 rounded-md bg-accent px-8 font-semibold text-white transition-transform hover:-translate-y-px disabled:opacity-50"
            >
              {phase === 'submitting' ? 'Sending…' : 'Send RSVP'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CalendarRow({ name, startsAt, venue }: { name: string; startsAt: string; venue: string | null }) {
  const [links, setLinks] = useState<{ g: string; ics: string } | null>(null)
  useEffect(() => {
    import('@/lib/calendar').then(({ googleCalendarUrl, icsDataUrl }) => {
      const e = { title: name, startsAt, venue }
      setLinks({ g: googleCalendarUrl(e), ics: icsDataUrl(e) })
    })
  }, [name, startsAt, venue])
  if (!links) return null
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-sm last:border-0">
      <span className="min-w-0 truncate text-ink">{name}</span>
      <span className="flex shrink-0 gap-3">
        <a href={links.g} target="_blank" rel="noreferrer" className="text-accent-ink underline underline-offset-4">Google</a>
        <a href={links.ics} download={`${name}.ics`} className="text-accent-ink underline underline-offset-4">Apple / .ics</a>
      </span>
    </div>
  )
}

function EventChoiceRow({ event, status, error, limit, limitReached, onChange }: {
  event: GuestEventView
  status: Status
  error?: string
  /** Household allocation for this event, if the hosts set one. */
  limit?: number
  /** True when the household has used its whole allocation for this event. */
  limitReached?: boolean
  onChange: (s: Status) => void
}) {
  const locked = event.deadlinePassed
  // The cap only blocks NEW yeses — anyone already attending can still change.
  const allocationFull = Boolean(limitReached) && status !== 'attending'
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-ink">{event.name}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            {formatEventDateTime(event.startsAt) ?? 'Date TBC'}
            {event.venueName ? ` · ${event.venueName}` : ''}
            {limit !== undefined ? ` · up to ${limit} of you` : ''}
          </p>
        </div>
        {locked ? (
          <span className="rounded-pill bg-paper-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            {status === 'pending' ? 'Closed' : status === 'attending' ? 'Going ✓' : 'Can’t make it'}
          </span>
        ) : (
          <div className="flex rounded-md border border-line bg-paper-2 p-1" role="group" aria-label={`${event.name} response`}>
            {(['attending', 'declined'] as const).map((s) => {
              const active = status === s
              const disabled = s === 'attending' && (event.capacityFull || allocationFull) && !active
              return (
                <button key={s} type="button" disabled={disabled}
                  onClick={() => onChange(active ? 'pending' : s)}
                  aria-pressed={active}
                  className={`min-h-11 rounded-[6px] px-4 text-sm font-medium transition-colors disabled:opacity-40 ${
                    active
                      ? s === 'attending' ? 'bg-accent text-white' : 'bg-ink text-paper'
                      : 'text-ink-2'
                  }`}>
                  {s === 'attending' ? 'Joyfully yes' : 'Regretfully no'}
                </button>
              )
            })}
          </div>
        )}
      </div>
      {event.capacityFull && status !== 'attending' && !locked && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-warn">This event is at capacity</p>
      )}
      {!event.capacityFull && allocationFull && !locked && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-warn">
          Your household’s {limit} spot{limit === 1 ? '' : 's'} for this event {limit === 1 ? 'is' : 'are'} taken — untick someone to swap
        </p>
      )}
      {error && <p className="mt-1 text-sm text-bad">{error}</p>}
    </div>
  )
}

function QuestionField({ q, value, onChange }: {
  q: QuestionView
  value: unknown
  onChange: (v: unknown) => void
}) {
  const label = (
    <span className="mb-1.5 block text-sm font-medium text-ink">
      {q.label}
      {q.required && <span className="ml-1 text-accent-ink" aria-hidden>*</span>}
      {q.helpText && <span className="ml-2 text-xs font-normal text-ink-3">{q.helpText}</span>}
    </span>
  )

  if (q.type === 'yes_no') {
    return (
      <div className="mb-4">
        {label}
        <div className="flex rounded-md border border-line bg-paper-2 p-1">
          {['Yes', 'No'].map((opt) => (
            <button key={opt} type="button" onClick={() => onChange(opt === 'Yes')}
              aria-pressed={value === (opt === 'Yes')}
              className={`min-h-11 flex-1 rounded-[6px] text-sm font-medium ${
                value === (opt === 'Yes') ? 'bg-accent text-white' : 'text-ink-2'
              }`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (q.type === 'single_choice' || q.type === 'meal_choice') {
    return (
      <div className="mb-4">
        {label}
        <div className="flex flex-wrap gap-2">
          {q.options.map((opt) => (
            <button key={opt} type="button" onClick={() => onChange(opt)}
              aria-pressed={value === opt}
              className={`min-h-11 rounded-md border px-4 text-sm font-medium transition-colors ${
                value === opt ? 'border-accent bg-accent text-white' : 'border-line bg-paper-2 text-ink-2 hover:border-accent'
              }`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (q.type === 'multi_choice') {
    const arr = Array.isArray(value) ? (value as string[]) : []
    return (
      <div className="mb-4">
        {label}
        <div className="flex flex-wrap gap-2">
          {q.options.map((opt) => {
            const on = arr.includes(opt)
            return (
              <button key={opt} type="button"
                onClick={() => onChange(on ? arr.filter((x) => x !== opt) : [...arr, opt])}
                aria-pressed={on}
                className={`min-h-11 rounded-md border px-4 text-sm font-medium transition-colors ${
                  on ? 'border-accent bg-accent text-white' : 'border-line bg-paper-2 text-ink-2 hover:border-accent'
                }`}>
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    )
  }
  return (
    <label className="mb-4 block">
      {label}
      <input
        type="text"
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full rounded-md border border-line bg-paper-2 px-3.5 text-ink outline-none focus:border-accent"
      />
    </label>
  )
}
