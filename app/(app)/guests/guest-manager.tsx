'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  addGuest, addHousehold, archiveGuest, archiveHousehold, importGuests, inviteSideToEvent,
  setEventAllocation, setInvitation, setHouseholdInvitations, type ImportRow,
} from './actions'
import { askConfirm, notify } from '@/components/ui/overlays'
import { restoreArchived, restoreHousehold } from '@/app/(app)/actions'
import { formatEventDateTime } from '@/lib/utils'
import { Search, X } from 'lucide-react'

export interface MatrixEvent {
  id: string; name: string; accent?: string | null; capacity?: number | null
  startsAt?: string | null; venueName?: string | null
}
export interface MatrixGuest {
  id: string; fullName: string; email: string | null
  isChild: boolean; plusOneAllowed: boolean; invitedEventIds: string[]
}
export interface MatrixHousehold { id: string; name: string; side: string | null; guests: MatrixGuest[] }
/** 2c: RSVP data the lens needs — status per guest × event, plus answers. */
export interface RsvpStatusRow { guestId: string; eventId: string; status: string }
export interface LensQuestion { id: string; eventId: string | null; label: string; type: string; options: string[] }
export interface LensAnswer { guestId: string; questionId: string; value: unknown }
/** Per-household event cap — "up to N guests" (original-site port). */
export interface AllocationRow { householdId: string; eventId: string; maxGuests: number }

export function GuestManager({ events, households, responses = [], questions = [], answers = [], allocations = [] }: {
  events: MatrixEvent[]
  households: MatrixHousehold[]
  responses?: RsvpStatusRow[]
  questions?: LensQuestion[]
  answers?: LensAnswer[]
  allocations?: AllocationRow[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const refresh = () => startTransition(() => router.refresh())
  const [error, setError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [showAdd, setShowAdd] = useState(households.length === 0)
  // 2b: guest-level work happens in the drawer; the register stays calm.
  const [openId, setOpenId] = useState<string | null>(null)
  const openHousehold = households.find((h) => h.id === openId) ?? null
  // 2c: pick a celebration to plan it on its own — 'all' keeps the register.
  const [lensId, setLensId] = useState<string>('all')
  const lensEvent = events.find((e) => e.id === lensId) ?? null

  async function onAddHousehold(fd: FormData) {
    setError(null)
    const res = await addHousehold(fd)
    if (res?.error) setError(res.error); else refresh()
  }

  const totalGuests = households.reduce((n, h) => n + h.guests.length, 0)

  // 2a: finding is the hero — search + side chips + a "not invited yet"
  // working filter live in the one primary bar; adding is a button.
  const [q, setQ] = useState('')
  const [sideFilter, setSideFilter] = useState<string>('all')
  const [onlyUninvited, setOnlyUninvited] = useState(false)
  const sides = [...new Set(households.map((h) => (h.side ?? '').trim()).filter(Boolean))]
  const isUninvited = (h: MatrixHousehold) => h.guests.every((g) => g.invitedEventIds.length === 0)
  const uninvitedCount = households.filter(isUninvited).length
  const needle = q.trim().toLowerCase()
  const shown = households.filter((h) => {
    if (sideFilter !== 'all' && (h.side ?? '').trim() !== sideFilter) return false
    if (onlyUninvited && !isUninvited(h)) return false
    if (!needle) return true
    return h.name.toLowerCase().includes(needle) ||
      h.guests.some((g) => g.fullName.toLowerCase().includes(needle) || (g.email ?? '').toLowerCase().includes(needle))
  })
  const shownGuests = shown.reduce((n, h) => n + h.guests.length, 0)
  const filtered = needle !== '' || sideFilter !== 'all' || onlyUninvited

  const chip = (active: boolean) =>
    `rounded-pill px-3 py-1 text-[12.5px] font-medium transition-colors ${
      active ? 'bg-ink text-paper' : 'border border-line text-ink-2 hover:border-line-2'}`

  return (
    <div className="space-y-6">
      {/* Primary bar: find first, then add (2a) */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-card border border-line bg-surface px-4 py-2.5 shadow-card">
        <Search size={15} strokeWidth={1.7} className="shrink-0 text-ink-3" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Find a household, guest or email…"
          className="min-w-36 flex-1 border-none bg-transparent py-1.5 text-[13.5px] text-ink outline-none" />
        <button type="button" onClick={() => setSideFilter('all')} className={chip(sideFilter === 'all' && !onlyUninvited)}>
          All
        </button>
        {sides.map((s) => (
          <button key={s} type="button" onClick={() => setSideFilter(sideFilter === s ? 'all' : s)}
            className={chip(sideFilter === s)}>
            {s}
          </button>
        ))}
        {uninvitedCount > 0 && (
          <button type="button" onClick={() => setOnlyUninvited((v) => !v)} className={chip(onlyUninvited)}>
            Not invited yet · {uninvitedCount}
          </button>
        )}
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 xl:inline">
          {households.length} households · {totalGuests} guests
        </span>
        <span aria-hidden className="h-6 w-px bg-line" />
        <button type="button" onClick={() => setShowAdd((s) => !s)}
          className="rounded-md bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white">
          ＋ Add household
        </button>
        <button type="button" onClick={() => setShowImport((s) => !s)}
          className="rounded-md border border-line bg-paper-2 px-3 py-2 text-[12.5px] text-ink transition-colors hover:border-accent">
          {showImport ? 'Close import' : 'Paste import'}
        </button>
      </div>

      {/* Add household — a form on demand, not the hero position */}
      {showAdd && (
        <form action={onAddHousehold}
          className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
          <label className="block">
            <span className="eyebrow mb-1.5 block">New household</span>
            <input name="name" required placeholder="The Shah Family"
              className="w-52 rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent" />
          </label>
          <label className="block">
            <span className="eyebrow mb-1.5 block">Side (optional)</span>
            <input name="side" placeholder="Bride"
              className="w-28 rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent" />
          </label>
          <button type="submit"
            className="rounded-md bg-accent px-5 py-2.5 font-semibold text-white">
            Add household
          </button>
        </form>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}

      {showImport && <ImportWizard onDone={() => { setShowImport(false); refresh() }} />}

      {/* 2c: event lens chips — pick a celebration, or keep the register */}
      {events.length > 0 && households.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setLensId('all')}
            className={`min-w-[124px] flex-1 rounded-card border px-3 py-2.5 text-left transition-colors sm:flex-none ${
              lensId === 'all' ? 'border-accent bg-accent-soft shadow-card' : 'border-line bg-surface hover:border-line-2'}`}>
            <span className="text-[12px] font-semibold text-ink">All events</span>
            <span className="mt-0.5 block font-mono text-[9.5px] text-ink-3 nums">{totalGuests} guests</span>
          </button>
          {events.map((e) => {
            const invited = households.reduce((n, h) => n + h.guests.filter((g) => g.invitedEventIds.includes(e.id)).length, 0)
            const invitedIds = new Set(households.flatMap((h) => h.guests.filter((g) => g.invitedEventIds.includes(e.id)).map((g) => g.id)))
            const going = responses.filter((r) => r.eventId === e.id && r.status === 'attending' && invitedIds.has(r.guestId)).length
            return (
              <button key={e.id} type="button" onClick={() => setLensId(lensId === e.id ? 'all' : e.id)}
                className={`min-w-[124px] flex-1 rounded-card border px-3 py-2.5 text-left transition-colors sm:flex-none ${
                  lensId === e.id ? 'border-accent bg-accent-soft shadow-card' : 'border-line bg-surface hover:border-line-2'}`}>
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.accent ?? 'var(--accent)' }} />
                  {e.name}
                </span>
                <span className="mt-0.5 block font-mono text-[9.5px] text-ink-3 nums">{invited} invited · {going} going</span>
              </button>
            )
          })}
        </div>
      )}

      {filtered && households.length > 0 && (
        <p className="text-[12px] text-ink-3">
          Showing {shown.length} of {households.length} households · {shownGuests} guests
        </p>
      )}

      {households.length === 0 && (
        <div className="rounded-card border border-dashed border-line bg-paper-2 p-10 text-center text-ink-2">
          No households yet. Add one above, or paste your whole list at once.
        </div>
      )}
      {households.length > 0 && shown.length === 0 && (
        <div className="rounded-card border border-dashed border-line bg-paper-2 p-8 text-center text-ink-2">
          Nothing matches &ldquo;{q}&rdquo;{sideFilter !== 'all' ? ` on the ${sideFilter} side` : ''}.
        </div>
      )}

      {shown.length > 0 && !lensEvent && (
        <Register households={shown} events={events} openId={openId} onOpen={setOpenId} />
      )}

      {shown.length > 0 && lensEvent && (
        <EventLens event={lensEvent} households={shown} sides={sides}
          responses={responses} questions={questions} answers={answers} onChanged={refresh} />
      )}

      {openHousehold && !lensEvent && (
        <HouseholdDrawer
          key={openHousehold.id}
          household={openHousehold}
          events={events}
          allocations={allocations.filter((a) => a.householdId === openHousehold.id)}
          onClose={() => setOpenId(null)}
          onChanged={refresh}
        />
      )}
    </div>
  )
}

/** 2c: the lens — plan one celebration at a time. Guest chips toggle the
 * invitation for THIS event (pill = invited, ✓/✗ = answered); RSVP answers
 * and the chase list live beside the list, so the daily "check + chase"
 * loop happens here. */
function EventLens({ event, households, sides, responses, questions, answers, onChanged }: {
  event: MatrixEvent
  households: MatrixHousehold[]
  sides: string[]
  responses: RsvpStatusRow[]
  questions: LensQuestion[]
  answers: LensAnswer[]
  onChanged: () => void
}) {
  const [sideMenu, setSideMenu] = useState(false)
  const respBy = useMemo(
    () => new Map(responses.filter((r) => r.eventId === event.id).map((r) => [r.guestId, r.status])),
    [responses, event.id])

  const invitedGuests = households.flatMap((h) => h.guests).filter((g) => g.invitedEventIds.includes(event.id))
  const invitedIds = new Set(invitedGuests.map((g) => g.id))
  const going = invitedGuests.filter((g) => respBy.get(g.id) === 'attending').length
  const declined = invitedGuests.filter((g) => respBy.get(g.id) === 'declined').length
  const awaitingGuests = invitedGuests.filter((g) => !respBy.get(g.id) || respBy.get(g.id) === 'pending')
  const awaiting = awaitingGuests.length
  const denom = event.capacity && event.capacity > 0 ? Math.max(event.capacity, invitedGuests.length) : invitedGuests.length
  const pct = (n: number) => (denom ? `${(n / denom) * 100}%` : '0%')

  const rows = households.filter((h) => h.guests.some((g) => g.invitedEventIds.includes(event.id)))
  const notYetInvited = households.length - rows.length

  async function inviteSide(side: string | null) {
    setSideMenu(false)
    const label = side === null ? 'everyone' : `the ${side} side`
    if (!(await askConfirm({
      title: `Invite ${label} to ${event.name}?`,
      body: 'Every guest gets an invitation to this event. No one is uninvited by this.',
      confirmLabel: 'Invite', destructive: false,
    }))) return
    const res = await inviteSideToEvent(side, event.id)
    if (res?.error) notify('Could not invite — try again')
    else notify(`${res.invited ?? 0} guests invited to ${event.name}`)
    onChanged()
  }

  // Answers so far: this event's questions plus wedding-wide ones, tallied
  // over this event's invited guests.
  const tallies = questions
    .filter((q) => q.eventId === event.id || q.eventId === null)
    .map((q) => {
      const counts = new Map<string, number>()
      for (const a of answers) {
        if (a.questionId !== q.id || !invitedIds.has(a.guestId)) continue
        const vals = Array.isArray(a.value) ? a.value : [a.value]
        for (const v of vals) {
          const label = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)
          if (!label) continue
          counts.set(label, (counts.get(label) ?? 0) + 1)
        }
      }
      return { q, rows: [...counts.entries()].sort((a, b) => b[1] - a[1]) }
    })
    .filter((t) => t.rows.length > 0)

  return (
    <div className="space-y-3">
      {/* Selected event banner: the numbers that run this celebration */}
      <div className="rounded-card border border-line bg-surface px-4 py-3.5 shadow-card">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <p className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink">
            <span className="h-[9px] w-[9px] rounded-full" style={{ background: event.accent ?? 'var(--accent)' }} />
            {event.name}
          </p>
          <span className="font-mono text-[10px] text-ink-3">
            {formatEventDateTime(event.startsAt ?? null) ?? 'Date TBC'}
            {event.venueName ? ` · ${event.venueName}` : ''}
          </span>
          <span className="ml-auto flex gap-2">
            {awaiting > 0 && (
              <Link href="/invitations" title="Every household has its private link — chase from Invitations"
                className="rounded-md bg-accent px-3 py-1.5 text-[12px] font-semibold text-white">
                Chase {awaiting} awaiting →
              </Link>
            )}
            <a href="/rsvps/export"
              className="rounded-md border border-line bg-paper-2 px-3 py-1.5 text-[12px] text-ink transition-colors hover:border-accent">
              Export list
            </a>
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <div className="flex h-2 min-w-40 flex-1 overflow-hidden rounded-pill bg-surface-2">
            <span style={{ width: pct(going) }} className="bg-ok" />
            <span style={{ width: pct(declined) }} className="bg-bad" />
            <span style={{ width: pct(awaiting) }} className="bg-warn" />
          </div>
          <span className="font-mono text-[10.5px] text-ink-2 nums">
            {invitedGuests.length} invited · <b className="font-semibold text-ok">{going} going</b> · {declined} declined · {awaiting} awaiting
            {event.capacity != null && <> · <b className="font-semibold text-ink">cap {event.capacity}</b></>}
          </span>
        </div>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[1fr_280px]">
        {/* Who's invited: chips toggle THIS event per guest */}
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <div className="flex items-center gap-2 border-b border-line bg-paper-2 px-4 py-2">
            <span className="text-[11px] font-medium text-ink-2">Who&rsquo;s invited to {event.name}</span>
            <div className="relative ml-auto">
              <button type="button" onClick={() => setSideMenu((s) => !s)}
                className="rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-2 transition-colors hover:border-accent">
                ＋ Invite a whole side…
              </button>
              {sideMenu && (
                <div className="absolute right-0 top-8 z-20 w-44 rounded-card border border-line bg-surface p-1 shadow-lift">
                  <button type="button" onClick={() => inviteSide(null)}
                    className="block w-full rounded-md px-2.5 py-1.5 text-left text-[12px] text-ink hover:bg-paper-2">
                    Everyone
                  </button>
                  {sides.map((s) => (
                    <button key={s} type="button" onClick={() => inviteSide(s)}
                      className="block w-full rounded-md px-2.5 py-1.5 text-left text-[12px] text-ink hover:bg-paper-2">
                      {s} side
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {rows.length === 0 && (
            <p className="p-6 text-center text-[12.5px] text-ink-3">
              No one is invited to {event.name} yet — use &ldquo;Invite a whole side&rdquo; above,
              or the All events register.
            </p>
          )}
          {rows.map((h) => (
            <div key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line px-4 py-2.5 first-of-type:border-t-0">
              <span className="w-40 shrink-0">
                <span className="block truncate text-[13px] font-medium text-ink">{h.name}</span>
                {h.side && <span className="block font-mono text-[8.5px] uppercase tracking-[0.08em] text-ink-3">{h.side}</span>}
              </span>
              <span className="flex min-w-0 flex-wrap gap-1.5">
                {h.guests.map((g) => (
                  <GuestEventChip key={`${g.id}:${g.invitedEventIds.includes(event.id)}`}
                    guest={g} eventId={event.id} status={respBy.get(g.id)} onChanged={onChanged} />
                ))}
              </span>
            </div>
          ))}
          {notYetInvited > 0 && rows.length > 0 && (
            <p className="border-t border-dashed border-line-2 px-4 py-2.5 text-center font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3">
              + {notYetInvited} household{notYetInvited === 1 ? '' : 's'} not invited yet — invite a side above, or use All events
            </p>
          )}
        </div>

        {/* Right rail: answers + the chase list */}
        <div className="flex flex-col gap-3">
          {tallies.length > 0 && (
            <div className="rounded-card border border-line bg-surface px-4 py-3.5 shadow-card">
              <p className="mb-1.5 text-[11px] font-medium text-ink-2">Answers so far</p>
              {tallies.map(({ q, rows: opts }) => (
                <div key={q.id} className="mb-2 last:mb-0">
                  <p className="microlabel mb-0.5">{q.label}</p>
                  {opts.map(([label, n]) => (
                    <p key={label} className="flex justify-between border-b border-line py-1 text-[12.5px] text-ink-2 last:border-0">
                      {label} <b className="font-mono font-semibold text-ink nums">{n}</b>
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
          {awaiting > 0 && (
            <div className="rounded-card border border-line bg-surface px-4 py-3.5 shadow-card">
              <p className="mb-1.5 text-[11px] font-medium text-ink-2">Worth a chase · {awaiting}</p>
              <p className="text-[12.5px] leading-relaxed text-ink-2">
                {awaitingGuests.slice(0, 5).map((g) => g.fullName).join(' · ')}
                {awaiting > 5 && <span className="text-ink-3"> +{awaiting - 5} more</span>}
              </p>
              <Link href="/invitations"
                className="mt-2.5 block w-full rounded-md border border-accent-line bg-accent-soft px-3 py-1.5 text-center text-[12px] font-semibold text-accent-ink transition-colors hover:border-accent">
                Chase them from Invitations →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** One guest chip in the lens: toggles the invitation for this event.
 * Pill = invited (✓ going, ✗ declined), outline = not invited. */
function GuestEventChip({ guest, eventId, status, onChanged }: {
  guest: MatrixGuest
  eventId: string
  status: string | undefined
  onChanged: () => void
}) {
  const initial = guest.invitedEventIds.includes(eventId)
  const [on, setOn] = useState(initial)

  async function toggle() {
    const next = !on
    setOn(next)
    const res = await setInvitation(guest.id, eventId, next)
    if (res?.error) setOn(initial) // roll back on failure
    else onChanged()
  }

  const mark = on && status === 'attending' ? '✓' : on && status === 'declined' ? '✗' : ''
  const cls = !on
    ? 'border border-line text-ink-3 hover:border-accent'
    : status === 'attending' ? 'bg-ok-soft text-ok'
    : status === 'declined' ? 'bg-bad-soft text-bad'
    : 'bg-accent-soft text-accent-ink'

  return (
    <button type="button" onClick={toggle}
      role="checkbox" aria-checked={on}
      aria-label={`${guest.fullName} invited to this event`}
      title={on ? 'Click to uninvite from this event' : 'Click to invite to this event'}
      className={`flex min-h-[30px] items-center gap-1.5 rounded-pill px-3 text-[12px] font-medium transition-colors ${cls}`}>
      {guest.fullName}
      {mark && <span className="text-[10px]">{mark}</span>}
    </button>
  )
}

/** 2b: the register — one scannable row per household, per-event coverage
 * as pills ("2/3" = two of three guests invited), sticky header, totals
 * footer. Clicking a row opens the household drawer. */
function Register({ households, events, openId, onOpen }: {
  households: MatrixHousehold[]
  events: MatrixEvent[]
  openId: string | null
  onOpen: (id: string) => void
}) {
  const cols = { gridTemplateColumns: `minmax(180px,2fr) 64px 56px repeat(${events.length}, minmax(88px,1fr))` }
  const invitedTo = (h: MatrixHousehold, eventId: string) =>
    h.guests.filter((g) => g.invitedEventIds.includes(eventId)).length
  const totals = events.map((e) =>
    households.reduce((n, h) => n + invitedTo(h, e.id), 0))

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
      <div className="max-h-[65vh] min-w-[720px] overflow-y-auto">
        {/* Sticky header: event dot + name + capacity */}
        <div style={cols} className="sticky top-0 z-10 grid items-center gap-x-3 border-b border-line bg-surface px-4 py-2.5 shadow-card">
          <span className="text-[11px] font-medium text-ink-3">Household</span>
          <span className="text-[11px] font-medium text-ink-3">Side</span>
          <span className="text-[11px] font-medium text-ink-3">Guests</span>
          {events.map((e) => (
            <span key={e.id} className="flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-ink-2">
              <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: e.accent ?? 'var(--accent)' }} />
              <span className="truncate">{e.name}</span>
              {e.capacity != null && <span className="font-mono text-[8.5px] text-ink-3">cap {e.capacity}</span>}
            </span>
          ))}
        </div>

        {households.map((h) => (
          <button key={h.id} type="button" onClick={() => onOpen(h.id)} style={cols}
            aria-expanded={openId === h.id}
            className={`grid w-full items-center gap-x-3 rounded-none border-t border-line px-4 py-2.5 text-left transition-colors first-of-type:border-t-0 hover:bg-paper-2 ${
              openId === h.id ? 'bg-surface-2 shadow-[inset_2px_0_0_var(--accent)]' : ''}`}>
            <span className="truncate text-[13px] font-medium text-ink">{h.name}</span>
            <span className="truncate font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">{h.side ?? ''}</span>
            <span className="font-mono text-[11px] text-ink-2 nums">{h.guests.length}</span>
            {events.map((e) => <CoveragePill key={e.id} invited={invitedTo(h, e.id)} total={h.guests.length} />)}
          </button>
        ))}

        {/* Totals footer */}
        <div style={cols} className="grid items-center gap-x-3 border-t border-line-2 bg-paper-2 px-4 py-2">
          <span className="microlabel col-span-3">Invited totals</span>
          {totals.map((n, i) => (
            <span key={events[i].id} className="text-center font-mono text-[10.5px] text-ink-2 nums">{n}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function CoveragePill({ invited, total }: { invited: number; total: number }) {
  if (total === 0) return <span className="text-center font-mono text-[10px] text-ink-3">—</span>
  const t = `${invited}/${total}`
  if (invited === 0) return <span className="text-center font-mono text-[10px] text-ink-3 nums">{t}</span>
  return (
    <span className="text-center">
      <span className={`inline-block min-w-[34px] rounded-pill px-2 py-0.5 font-mono text-[10px] nums ${
        invited === total
          ? 'bg-accent-soft text-accent-ink'
          : 'border border-line-2 text-ink-2'}`}>
        {t}
      </span>
    </span>
  )
}

/** 2b: the household drawer — guest-level work in one calm panel: batch
 * event toggles, per-guest event pills (≥30px targets), add guest, and a
 * quiet archive at the bottom (never fat-fingered from the list). */
function HouseholdDrawer({ household, events, allocations, onClose, onChanged }: {
  household: MatrixHousehold
  events: MatrixEvent[]
  allocations: AllocationRow[]
  onClose: () => void
  onChanged: () => void
}) {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function onAddGuest(fd: FormData) {
    setError(null)
    const res = await addGuest(household.id, fd)
    if (res?.error) setError(res.error); else onChanged()
  }

  /** Whole-household toggle per event — one batched server action. */
  async function toggleAll(eventId: string, invite: boolean) {
    const res = await setHouseholdInvitations(household.id, eventId, invite)
    if (res?.error) notify('Could not update the household — try again')
    else notify(invite ? `${household.name} invited` : `${household.name} uninvited`)
    onChanged()
  }

  const emails = household.guests.filter((g) => g.email).length

  return (
    <aside aria-label={`${household.name} details`}
      className="fixed inset-y-0 right-0 z-50 flex w-[360px] max-w-[calc(100vw-24px)] flex-col border-l border-line bg-surface shadow-lift">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-ink">{household.name}</p>
        {household.side && (
          <span className="rounded-pill bg-paper-2 px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.08em] text-ink-3">
            {household.side}
          </span>
        )}
        <button type="button" onClick={onClose} aria-label="Close household details"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-paper-2 hover:text-ink">
          <X size={15} strokeWidth={1.7} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
        <p className="text-[11.5px] text-ink-3">
          {household.guests.length} guest{household.guests.length === 1 ? '' : 's'} · {emails} email{emails === 1 ? '' : 's'}
        </p>

        {/* Batch toggles: invite the whole household per event, one request */}
        {events.length > 0 && household.guests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {events.map((e) => {
              const invited = household.guests.filter((g) => g.invitedEventIds.includes(e.id)).length
              const all = invited === household.guests.length
              return (
                <button key={e.id} type="button" onClick={() => toggleAll(e.id, !all)}
                  title={all ? `Uninvite everyone from ${e.name}` : `Invite the whole household to ${e.name} — one click`}
                  className={`flex min-h-[30px] items-center gap-1.5 rounded-pill px-2.5 text-[11.5px] font-medium transition-colors ${
                    all ? 'bg-accent-soft text-accent-ink'
                    : invited > 0 ? 'border border-line-2 text-ink-2 hover:border-accent'
                    : 'border border-line text-ink-3 hover:border-accent'}`}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: e.accent ?? 'var(--accent)' }} />
                  {e.name} <span className="font-mono text-[9px] nums">{invited}/{household.guests.length}</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2.5">
          {household.guests.length === 0 && (
            <p className="rounded-card border border-dashed border-line bg-paper-2 p-4 text-center text-[12.5px] text-ink-3">
              No guests yet — add the first one below.
            </p>
          )}
          {household.guests.map((g) => (
            <GuestCard key={`${g.id}:${g.invitedEventIds.join('.')}`} guest={g} events={events} onChanged={onChanged} />
          ))}
        </div>

        {/* Add guest */}
        <form action={onAddGuest} className="mt-4 space-y-2.5 border-t border-line pt-4">
          <p className="eyebrow">Add guest to this household</p>
          <input name="full_name" required placeholder="Priya Shah"
            className="w-full rounded-md border border-line bg-paper-2 px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
          <input name="email" type="email" placeholder="priya@example.com (optional)"
            className="w-full rounded-md border border-line bg-paper-2 px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-ink-2">
              <input type="checkbox" name="is_child" /> Child
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink-2">
              <input type="checkbox" name="plus_one_allowed" /> +1 allowed
            </label>
            <button type="submit"
              className="ml-auto rounded-md border border-line bg-paper-2 px-4 py-2 text-[12.5px] font-medium transition-colors hover:border-accent">
              Add
            </button>
          </div>
          {error && <p className="text-[12.5px] text-bad">{error}</p>}
        </form>

        {/* Allocations — "up to N guests" per event; how big families get
            planned (day events open, evening capped). Blank = no cap. */}
        {events.length > 0 && household.guests.length > 0 && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="eyebrow">Allocation — up to N guests per event</p>
            <p className="mt-1 text-[11px] text-ink-3">
              Caps how many from this household can say yes. Leave blank for no cap.
            </p>
            <div className="mt-2 space-y-1.5">
              {events.map((e) => (
                <AllocationField key={e.id} household={household} event={e}
                  current={allocations.find((a) => a.eventId === e.id)?.maxGuests ?? null}
                  onChanged={onChanged} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
        <Link href="/invitations" className="text-[12px] font-medium text-accent-ink hover:underline">
          Invitation link →
        </Link>
        <button type="button"
          onClick={async () => {
            if (!(await askConfirm({ title: `Archive ${household.name}?`, body: 'The household and its guests move out of your lists. Nothing is deleted.' }))) return
            await archiveHousehold(household.id)
            notify(`${household.name} archived`, {
              actionLabel: 'Undo',
              onAction: () => { restoreHousehold(household.id).then(onChanged) },
            })
            onClose()
            onChanged()
          }}
          className="rounded-md text-[12px] text-ink-3 underline underline-offset-[3px] hover:text-bad">
          Archive household
        </button>
      </div>
    </aside>
  )
}

/** One event's allocation cap — commits on blur / Enter, clears on blank. */
function AllocationField({ household, event, current, onChanged }: {
  household: MatrixHousehold
  event: MatrixEvent
  current: number | null
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)

  async function commit(raw: string) {
    const trimmed = raw.trim()
    const next = trimmed === '' ? null : Number(trimmed)
    if (next === current || (next !== null && (!Number.isInteger(next) || next < 1))) return
    setBusy(true)
    const res = await setEventAllocation(household.id, event.id, next)
    setBusy(false)
    if (res?.error) notify(res.error, { tone: 'warn' })
    else {
      notify(next === null
        ? `${event.name}: cap removed for ${household.name}`
        : `${event.name}: up to ${next} from ${household.name}`)
      onChanged()
    }
  }

  return (
    <label className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: event.accent ?? 'var(--accent)' }} />
      <span className="min-w-0 flex-1 truncate text-[12px] text-ink-2">{event.name}</span>
      <span className="flex items-center gap-1">
        <span className="font-mono text-[8.5px] uppercase text-ink-3">up to</span>
        <input type="number" min={1} inputMode="numeric" defaultValue={current ?? ''} key={current ?? 'unset'}
          placeholder="—" disabled={busy}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className="w-14 rounded-md border border-line bg-paper-2 px-2 py-1 text-center font-mono text-[11.5px] text-ink outline-none focus:border-accent disabled:opacity-50" />
      </span>
    </label>
  )
}

/** One guest inside the drawer: identity + per-event pill toggles. */
function GuestCard({ guest, events, onChanged }: {
  guest: MatrixGuest
  events: MatrixEvent[]
  onChanged: () => void
}) {
  // Optimistic pill state, reconciled by router.refresh() after the server confirms.
  const [invited, setInvited] = useState<Set<string>>(() => new Set(guest.invitedEventIds))
  const initial = useMemo(() => new Set(guest.invitedEventIds), [guest.invitedEventIds])

  async function toggle(eventId: string) {
    const next = new Set(invited)
    const nowInvited = !next.has(eventId)
    if (nowInvited) next.add(eventId); else next.delete(eventId)
    setInvited(next)
    const res = await setInvitation(guest.id, eventId, nowInvited)
    if (res?.error) setInvited(initial) // roll back on failure
    else onChanged()
  }

  return (
    <div className="rounded-card border border-line bg-paper p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink">
            {guest.fullName}
            {guest.isChild && (
              <span className="ml-1.5 rounded-pill bg-surface-2 px-1.5 py-px font-mono text-[8.5px] uppercase text-ink-3">child</span>
            )}
            {guest.plusOneAllowed && (
              <span className="ml-1.5 rounded-pill bg-accent-soft px-1.5 py-px font-mono text-[8.5px] uppercase text-accent-ink">+1</span>
            )}
          </p>
          {guest.email && <p className="mt-0.5 truncate text-[11px] text-ink-3">{guest.email}</p>}
        </div>
        <button type="button" title={`Archive ${guest.fullName}`} aria-label={`Archive ${guest.fullName}`}
          onClick={async () => {
            if (!(await askConfirm({ title: `Archive ${guest.fullName}?`, body: 'They leave the guest list and event invitations. Nothing is deleted.' }))) return
            await archiveGuest(guest.id)
            notify(`${guest.fullName} archived`, {
              actionLabel: 'Undo',
              onAction: () => { restoreArchived('guests', guest.id).then(onChanged) },
            })
            onChanged()
          }}
          className="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-bad-soft hover:text-bad">
          <X size={13} strokeWidth={1.7} />
        </button>
      </div>
      {events.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {events.map((e) => {
            const on = invited.has(e.id)
            return (
              <button key={e.id} type="button" onClick={() => toggle(e.id)}
                role="checkbox" aria-checked={on}
                aria-label={`${guest.fullName} invited to ${e.name}`}
                className={`flex min-h-[30px] items-center gap-1.5 rounded-pill px-2.5 text-[11.5px] font-medium transition-colors ${
                  on ? 'bg-accent-soft text-accent-ink'
                  : 'border border-line text-ink-3 hover:border-accent'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${on ? '' : 'opacity-40'}`}
                  style={{ background: e.accent ?? 'var(--accent)' }} />
                {e.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ImportWizard({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<ImportRow[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  async function parse() {
    if (!text.trim()) return
    setParsing(true); setNote(null)
    // Server tries AI (if configured), else falls back to a simple parser.
    const { parseGuestPaste } = await import('./actions')
    const res = await parseGuestPaste(text)
    setParsing(false)
    setPreview(res.rows)
    setNote(res.usedAi
      ? `Cleaned up with AI — grouped into ${new Set(res.rows.map((r) => r.household)).size} households. Check it over.`
      : 'Parsed by columns. Paste "Household, Full name, email" per line, or connect AI for messy lists.')
  }

  async function confirm() {
    if (!preview?.length) return
    setBusy(true)
    const res = await importGuests(preview)
    setBusy(false)
    if (res?.error) setResult(res.error)
    else { setResult(res.summary ?? 'Imported.'); setPreview(null); setText(''); onDone() }
  }

  return (
    <div className="rounded-card border border-accent-line bg-accent-soft/40 p-6">
      <p className="eyebrow mb-2">Import guests</p>
      <p className="mb-3 text-sm text-ink-2">
        Paste from anywhere — a spreadsheet, WhatsApp, your notes. We tidy it into households and guests
        (AI clean-up when connected; otherwise use <span className="font-mono text-xs">Household, Full name, email</span> per line).
        Existing guests are skipped, never overwritten.
      </p>
      <textarea
        value={text} onChange={(e) => setText(e.target.value)} rows={6}
        placeholder={'Raj & Priya Shah, priya@example.com\nThe Patels — Anil, Meera and the two kids\nDev Kapoor'}
        className="w-full rounded-md border border-line bg-surface px-3 py-2.5 font-mono text-xs text-ink outline-none focus:border-accent"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={parse} disabled={parsing}
          className="rounded-md border border-line bg-surface px-4 py-2 text-sm hover:border-accent disabled:opacity-50">
          {parsing ? 'Tidying…' : 'Tidy & preview'}
        </button>
        {preview && (
          <button type="button" onClick={confirm} disabled={busy}
            className="rounded-md bg-accent px-5 py-2 font-semibold text-white disabled:opacity-50">
            {busy ? 'Importing…' : `Import ${preview.length} guests`}
          </button>
        )}
        {result && <span className="text-sm text-ink-2">{result}</span>}
      </div>
      {note && <p className="mt-2 text-xs text-ink-3">{note}</p>}
      {preview && (
        <div className="mt-4 max-h-48 overflow-y-auto rounded-md border border-line bg-surface p-3 text-sm">
          {preview.map((r, i) => (
            <p key={i} className="text-ink-2">
              <span className="text-ink">{r.fullName}</span> → {r.household}{r.email ? ` · ${r.email}` : ''}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
