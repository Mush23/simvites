'use client'

import { useEffect, useMemo, useState } from 'react'
import type { GuestRsvpContext, GuestEventView, QuestionView } from '@/lib/guest-rsvp'
import { formatEventDateTime } from '@/lib/utils'
import { submitGuestRsvp, type GuestSubmission } from './actions'

// The money path. Mobile-first: big tap targets, minimal typing, clear
// progress, instant confirmation (audit UI/UX standards).

type Status = 'pending' | 'attending' | 'declined'

export function RsvpFlow({ ctx }: { ctx: GuestRsvpContext }) {
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

  const anyAttending = (guestId: string) =>
    Object.entries(choices).some(([k, v]) => k.startsWith(`${guestId}:`) && v === 'attending')

  const visibleQuestions = (guestId: string, scope: 'global' | string): QuestionView[] =>
    ctx.questions.filter((q) => {
      if (scope === 'global' ? q.eventId !== null : q.eventId !== scope) return false
      if (!q.showIf) return true
      const dep = ctx.questions.find((x) => x.key === q.showIf!.question_key)
      if (!dep) return true
      return (answers[guestId]?.[dep.id] ?? null) === q.showIf.equals
    })

  const unanswered = useMemo(() => {
    const missing: string[] = []
    for (const g of ctx.guests) {
      if (!anyAttending(g.guestId)) continue
      for (const q of ctx.questions) {
        if (!q.required || q.showIf) continue
        const scoped = q.eventId === null
          ? true
          : choices[`${g.guestId}:${q.eventId}`] === 'attending'
        if (!scoped) continue
        const v = answers[g.guestId]?.[q.id]
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
          missing.push(`${g.fullName}: ${q.label}`)
        }
      }
    }
    return missing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choices, answers, ctx])

  async function onSubmit() {
    setTopError(null)
    if (unanswered.length) {
      setTopError(`Please answer: ${unanswered.slice(0, 3).join(' · ')}${unanswered.length > 3 ? '…' : ''}`)
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
    const res = await submitGuestRsvp(submissions)
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
    const attendingEvents = ctx.guests
      .flatMap((g) => g.events)
      .filter((e, i, arr) => arr.findIndex((x) => x.eventId === e.eventId) === i)
      .filter((e) => ctx.guests.some((g) => choices[`${g.guestId}:${e.eventId}`] === 'attending') && e.startsAt)

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

    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6 text-center text-ink">
        <div className="max-w-md">
          <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-pill border-2 border-accent text-accent">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <p className="eyebrow mb-3">{ctx.siteTitle}</p>
          <h1 className="font-display text-4xl">Thank you.</h1>
          <p className="mt-4 leading-relaxed text-ink-2">
            Your responses for {ctx.householdName} are saved. You can return through your
            invitation link any time before the deadline to change them.
          </p>

          <button type="button" onClick={onPdf}
            className="mt-8 rounded-md bg-accent px-7 py-3 font-semibold text-white transition-transform hover:-translate-y-px">
            Download confirmation (PDF)
          </button>

          {attendingEvents.length > 0 && (
            <div className="mt-8 border-t border-line pt-6 text-left">
              <p className="eyebrow mb-3 text-center">Add to your calendar</p>
              {attendingEvents.map((e) => (
                <CalendarRow key={e.eventId} name={e.name} startsAt={e.startsAt!} venue={e.venueName} />
              ))}
            </div>
          )}
        </div>
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
                    {qs.map((q) => (
                      <QuestionField key={q.id} q={q}
                        value={answers[g.guestId]?.[q.id]}
                        onChange={(v) => setAnswers((a) => ({ ...a, [g.guestId]: { ...(a[g.guestId] ?? {}), [q.id]: v } }))} />
                    ))}
                  </div>
                )
              })}

              {/* Wedding-wide questions once the guest attends anything */}
              {anyAttending(g.guestId) && visibleQuestions(g.guestId, 'global').length > 0 && (
                <div className="mt-5 border-t border-line pt-4">
                  <p className="eyebrow mb-3">A few details</p>
                  {visibleQuestions(g.guestId, 'global').map((q) => (
                    <QuestionField key={q.id} q={q}
                      value={answers[g.guestId]?.[q.id]}
                      onChange={(v) => setAnswers((a) => ({ ...a, [g.guestId]: { ...(a[g.guestId] ?? {}), [q.id]: v } }))} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </main>

      {/* Sticky submit bar — thumb-reachable on mobile */}
      {!ctx.allDeadlinesPassed && (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/95 px-5 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            <p className="min-w-0 flex-1 truncate text-sm text-ink-3">
              {topError ? <span className="text-bad">{topError}</span> : 'You can change your answers any time before the deadline.'}
            </p>
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

function EventChoiceRow({ event, status, error, onChange }: {
  event: GuestEventView
  status: Status
  error?: string
  onChange: (s: Status) => void
}) {
  const locked = event.deadlinePassed
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-ink">{event.name}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            {formatEventDateTime(event.startsAt) ?? 'Date TBC'}
            {event.venueName ? ` · ${event.venueName}` : ''}
          </p>
        </div>
        {locked ? (
          <span className="rounded-pill bg-paper-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            {status === 'pending' ? 'Closed' : status}
          </span>
        ) : (
          <div className="flex rounded-md border border-line bg-paper-2 p-1" role="group" aria-label={`${event.name} response`}>
            {(['attending', 'declined'] as const).map((s) => {
              const active = status === s
              const disabled = s === 'attending' && event.capacityFull && !active
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
