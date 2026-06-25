'use client'

import { useMemo, useState } from 'react'
import type { HouseholdRsvpContext } from '@/lib/rsvp'
import { formatEventDate } from '@/lib/utils'
import { submitRsvpAction } from './actions'

function key(guestId: string, eventId: string) {
  return `${guestId}:${eventId}`
}

export function RsvpForm({ siteId, ctx }: { siteId: string; ctx: HouseholdRsvpContext }) {
  const initial = useMemo(() => {
    const m: Record<string, boolean> = {}
    for (const r of ctx.existing?.responses ?? []) m[key(r.guestId, r.eventId)] = r.attending
    return m
  }, [ctx])

  const [attending, setAttending] = useState<Record<string, boolean>>(initial)
  const [submittedBy, setSubmittedBy] = useState(ctx.existing?.submittedBy ?? '')
  const [message, setMessage] = useState(ctx.existing?.message ?? '')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  // attending count per event (for cap enforcement)
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const ev of ctx.events) {
      c[ev.eventId] = ctx.guests.reduce(
        (n, g) => n + (attending[key(g.id, ev.eventId)] ? 1 : 0),
        0,
      )
    }
    return c
  }, [attending, ctx])

  if (ctx.deadlinePassed) {
    return (
      <div className="mt-12 text-center">
        <p className="text-muted-foreground">
          RSVPs for <span className="text-foreground">{ctx.household.name}</span> are now closed.
          Thank you!
        </p>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="mt-12 text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-gold text-gold">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <h2 className="font-heading text-3xl font-light">Thank you!</h2>
        <p className="mt-3 text-muted-foreground">
          Your RSVP for {ctx.household.name} has been recorded. You can return any time
          before the deadline to update it.
        </p>
      </div>
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setError(null)
    const responses = ctx.guests.flatMap((g) =>
      ctx.events.map((ev) => ({
        guest_id: g.id,
        event_id: ev.eventId,
        attending: !!attending[key(g.id, ev.eventId)],
      })),
    )
    const res = await submitRsvpAction({
      siteId,
      householdId: ctx.household.id,
      submittedBy,
      message,
      responses,
    })
    if (res.error) {
      setError(res.error)
      setStatus('error')
    } else {
      setStatus('done')
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-12">
      <p className="mb-8 text-center text-muted-foreground">
        Welcome, <span className="text-foreground">{ctx.household.name}</span>. Please let us
        know who will be joining each celebration.
      </p>

      <div className="space-y-8">
        {ctx.events.map((ev) => {
          const atCap = counts[ev.eventId] >= ev.cap
          return (
            <div key={ev.eventId} className="rounded-lg border border-border bg-card p-5">
              <div className="mb-3 flex items-baseline justify-between border-b border-border pb-2">
                <h3 className="font-heading text-xl font-light text-card-foreground">{ev.name}</h3>
                <span className="text-[0.65rem] uppercase tracking-wide-soft text-muted-foreground">
                  {formatEventDate(ev.eventDate)} · up to {ev.cap}
                </span>
              </div>
              <div className="space-y-2">
                {ctx.guests.map((g) => {
                  const k = key(g.id, ev.eventId)
                  const checked = !!attending[k]
                  return (
                    <label key={g.id} className="flex items-center gap-3 text-sm text-card-foreground">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!checked && atCap}
                        onChange={(e) => setAttending((s) => ({ ...s, [k]: e.target.checked }))}
                      />
                      {g.name}
                      {g.isChild && <span className="text-xs text-muted-foreground">(child)</span>}
                    </label>
                  )
                })}
              </div>
              {atCap && (
                <p className="mt-2 text-[0.65rem] uppercase tracking-wide-soft text-gold-ink">
                  Capacity reached for this event
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-8 space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-[0.7rem] uppercase tracking-wide-soft text-muted-foreground">
            Submitted by
          </span>
          <input
            type="text"
            required
            value={submittedBy}
            onChange={(e) => setSubmittedBy(e.target.value)}
            className="w-full border-b border-border bg-transparent pb-2 text-foreground outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[0.7rem] uppercase tracking-wide-soft text-muted-foreground">
            Message or dietary notes (optional)
          </span>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border-b border-border bg-transparent pb-2 text-foreground outline-none"
          />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="mt-8 w-full rounded-full bg-primary px-6 py-3 text-[0.7rem] uppercase tracking-wide-soft text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {status === 'submitting' ? 'Sending…' : 'Send RSVP'}
      </button>
    </form>
  )
}
