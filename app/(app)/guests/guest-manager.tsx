'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  addGuest, addHousehold, archiveGuest, archiveHousehold, importGuests, setInvitation,
  type ImportRow,
} from './actions'

export interface MatrixEvent { id: string; name: string }
export interface MatrixGuest {
  id: string; fullName: string; email: string | null
  isChild: boolean; plusOneAllowed: boolean; invitedEventIds: string[]
}
export interface MatrixHousehold { id: string; name: string; side: string | null; guests: MatrixGuest[] }

export function GuestManager({ events, households }: { events: MatrixEvent[]; households: MatrixHousehold[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const refresh = () => startTransition(() => router.refresh())
  const [error, setError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  async function onAddHousehold(fd: FormData) {
    setError(null)
    const res = await addHousehold(fd)
    if (res?.error) setError(res.error); else refresh()
  }

  const totalGuests = households.reduce((n, h) => n + h.guests.length, 0)

  return (
    <div className="space-y-8">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-card border border-line bg-surface p-5 shadow-card">
        <form action={onAddHousehold} className="flex flex-wrap items-end gap-3">
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
            className="rounded-md bg-accent px-5 py-2.5 font-semibold text-white transition-transform hover:-translate-y-px">
            Add household
          </button>
        </form>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
            {households.length} households · {totalGuests} guests
          </span>
          <button type="button" onClick={() => setShowImport((s) => !s)}
            className="rounded-md border border-line bg-paper-2 px-4 py-2.5 text-sm text-ink transition-colors hover:border-accent">
            {showImport ? 'Close import' : 'Paste import'}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}

      {showImport && <ImportWizard onDone={() => { setShowImport(false); refresh() }} />}

      {households.length === 0 && (
        <div className="rounded-card border border-dashed border-line bg-paper-2 p-10 text-center text-ink-2">
          No households yet. Add one above, or paste your whole list at once.
        </div>
      )}

      {households.map((h) => (
        <HouseholdCard key={h.id} household={h} events={events} onChanged={refresh} />
      ))}
    </div>
  )
}

function HouseholdCard({ household, events, onChanged }: {
  household: MatrixHousehold; events: MatrixEvent[]; onChanged: () => void
}) {
  const [error, setError] = useState<string | null>(null)

  async function onAddGuest(fd: FormData) {
    setError(null)
    const res = await addGuest(household.id, fd)
    if (res?.error) setError(res.error); else onChanged()
  }

  return (
    <section className="rounded-card border border-line bg-surface p-6 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-2xl text-ink">{household.name}</h3>
        <div className="flex items-center gap-4">
          {household.side && (
            <span className="rounded-pill bg-paper-2 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
              {household.side}
            </span>
          )}
          <button type="button"
            onClick={() => { if (confirm(`Archive ${household.name} and its guests?`)) archiveHousehold(household.id).then(onChanged) }}
            className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3 hover:text-bad">
            Archive
          </button>
        </div>
      </div>

      {/* Invite matrix: rows = guests, columns = events */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="eyebrow pb-2 pr-4 text-left font-normal">Guest</th>
              {events.map((e) => (
                <th key={e.id} className="eyebrow pb-2 px-2 text-center font-normal">{e.name}</th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {household.guests.length === 0 && (
              <tr><td colSpan={events.length + 2} className="py-3 text-ink-3">No guests yet.</td></tr>
            )}
            {household.guests.map((g) => (
              <GuestRow key={g.id} guest={g} events={events} onChanged={onChanged} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Add guest */}
      <form action={onAddGuest} className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
        <label className="block">
          <span className="eyebrow mb-1.5 block">Add guest</span>
          <input name="full_name" required placeholder="Priya Shah"
            className="w-44 rounded-md border border-line bg-paper-2 px-3 py-2 text-ink outline-none focus:border-accent" />
        </label>
        <label className="block">
          <span className="eyebrow mb-1.5 block">Email (optional)</span>
          <input name="email" type="email" placeholder="priya@example.com"
            className="w-52 rounded-md border border-line bg-paper-2 px-3 py-2 text-ink outline-none focus:border-accent" />
        </label>
        <label className="flex items-center gap-1.5 pb-2 text-xs text-ink-2">
          <input type="checkbox" name="is_child" /> Child
        </label>
        <label className="flex items-center gap-1.5 pb-2 text-xs text-ink-2">
          <input type="checkbox" name="plus_one_allowed" /> +1 allowed
        </label>
        <button type="submit"
          className="rounded-md border border-line bg-paper-2 px-4 py-2 text-sm transition-colors hover:border-accent">
          Add
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </section>
  )
}

function GuestRow({ guest, events, onChanged }: {
  guest: MatrixGuest; events: MatrixEvent[]; onChanged: () => void
}) {
  // Optimistic cell state, reconciled by router.refresh() after the server confirms.
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
    <tr className="border-t border-line">
      <td className="py-2.5 pr-4">
        <span className="text-ink">{guest.fullName}</span>
        {guest.isChild && <span className="ml-2 font-mono text-[9px] uppercase text-ink-3">child</span>}
        {guest.plusOneAllowed && <span className="ml-2 font-mono text-[9px] uppercase text-accent-ink">+1</span>}
        {guest.email && <span className="ml-2 text-xs text-ink-3">{guest.email}</span>}
      </td>
      {events.map((e) => (
        <td key={e.id} className="px-2 py-2.5 text-center">
          <input
            type="checkbox"
            aria-label={`${guest.fullName} invited to ${e.name}`}
            checked={invited.has(e.id)}
            onChange={() => toggle(e.id)}
            className="h-4.5 w-4.5 accent-[var(--accent)]"
          />
        </td>
      ))}
      <td className="text-right">
        <button type="button" aria-label={`Archive ${guest.fullName}`}
          onClick={() => { if (confirm(`Archive ${guest.fullName}?`)) archiveGuest(guest.id).then(onChanged) }}
          className="font-mono text-[9px] uppercase text-ink-3 hover:text-bad">
          ✕
        </button>
      </td>
    </tr>
  )
}

function ImportWizard({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<ImportRow[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  function parse() {
    // One guest per line: "Household name, Full name, email(optional)"
    const rows: ImportRow[] = text.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
      const [household = '', fullName = '', email = ''] = line.split(',').map((s) => s.trim())
      return { household, fullName, email: email || undefined }
    }).filter((r) => r.household && r.fullName)
    setPreview(rows)
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
      <p className="eyebrow mb-2">Paste import</p>
      <p className="mb-3 text-sm text-ink-2">
        One guest per line: <span className="font-mono text-xs">Household name, Full name, email (optional)</span>.
        Existing guests are skipped, never overwritten.
      </p>
      <textarea
        value={text} onChange={(e) => setText(e.target.value)} rows={6}
        placeholder={'The Shah Family, Priya Shah, priya@example.com\nThe Shah Family, Raj Shah'}
        className="w-full rounded-md border border-line bg-surface px-3 py-2.5 font-mono text-xs text-ink outline-none focus:border-accent"
      />
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={parse}
          className="rounded-md border border-line bg-surface px-4 py-2 text-sm hover:border-accent">
          Preview
        </button>
        {preview && (
          <button type="button" onClick={confirm} disabled={busy}
            className="rounded-md bg-accent px-5 py-2 font-semibold text-white disabled:opacity-50">
            {busy ? 'Importing…' : `Import ${preview.length} guests`}
          </button>
        )}
        {result && <span className="text-sm text-ink-2">{result}</span>}
      </div>
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
