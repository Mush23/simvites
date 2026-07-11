'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  addGuest, addHousehold, archiveGuest, archiveHousehold, importGuests, setInvitation,
  type ImportRow,
} from './actions'
import { askConfirm, notify } from '@/components/ui/overlays'
import { restoreArchived, restoreHousehold } from '@/app/(app)/actions'
import { X } from 'lucide-react'

export interface MatrixEvent { id: string; name: string; accent?: string | null }
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

  // Search + side filter (overhaul spec: search pill + filter chips + summary)
  const [q, setQ] = useState('')
  const [sideFilter, setSideFilter] = useState<string>('all')
  const sides = [...new Set(households.map((h) => (h.side ?? '').trim()).filter(Boolean))]
  const needle = q.trim().toLowerCase()
  const shown = households.filter((h) => {
    if (sideFilter !== 'all' && (h.side ?? '').trim() !== sideFilter) return false
    if (!needle) return true
    return h.name.toLowerCase().includes(needle) ||
      h.guests.some((g) => g.fullName.toLowerCase().includes(needle) || (g.email ?? '').toLowerCase().includes(needle))
  })
  const shownGuests = shown.reduce((n, h) => n + h.guests.length, 0)

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
            className="rounded-md bg-accent px-5 py-2.5 font-semibold text-white">
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

      {/* Search + filters + live summary */}
      {households.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5">
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search households, guests, emails…"
            className="w-64 rounded-lg border border-line bg-surface px-3.5 py-2 text-[13.5px] text-ink outline-none focus:border-accent" />
          <button type="button" onClick={() => setSideFilter('all')}
            className={`rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors ${
              sideFilter === 'all' ? 'bg-ink text-paper' : 'border border-line text-ink-2 hover:border-line-2'}`}>
            All
          </button>
          {sides.map((s) => (
            <button key={s} type="button" onClick={() => setSideFilter(sideFilter === s ? 'all' : s)}
              className={`rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors ${
                sideFilter === s ? 'bg-ink text-paper' : 'border border-line text-ink-2 hover:border-line-2'}`}>
              {s}
            </button>
          ))}
          <span className="ml-auto text-[12px] text-ink-3">
            Showing {shown.length} of {households.length} households · {shownGuests} guests
          </span>
        </div>
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

      {shown.map((h) => (
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

  /** Column-header click (overhaul): toggle the whole household for an event. */
  async function toggleColumn(eventId: string, invite: boolean) {
    await Promise.all(
      household.guests
        .filter((g) => g.invitedEventIds.includes(eventId) !== invite)
        .map((g) => setInvitation(g.id, eventId, invite)),
    )
    notify(invite ? `${household.name} invited` : `${household.name} uninvited`)
    onChanged()
  }

  return (
    <section className="rounded-card border border-line bg-surface p-6 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[14.5px] font-semibold tracking-tight text-ink">{household.name}</h3>
        <div className="flex items-center gap-4">
          {household.side && (
            <span className="rounded-pill bg-paper-2 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
              {household.side}
            </span>
          )}
          <button type="button"
            onClick={async () => {
              if (!(await askConfirm({ title: `Archive ${household.name}?`, body: 'The household and its guests move out of your lists. Nothing is deleted.' }))) return
              await archiveHousehold(household.id)
              notify(`${household.name} archived`, {
                actionLabel: 'Undo',
                onAction: () => { restoreHousehold(household.id).then(onChanged) },
              })
              onChanged()
            }}
            className="rounded-md font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3 hover:text-bad">
            Archive
          </button>
        </div>
      </div>

      {/* Invite matrix: rows = guests, columns = events */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="pb-2 pr-4 text-left text-[12px] font-medium text-ink-3">Guest</th>
              {events.map((e) => {
                const allIn = household.guests.length > 0 &&
                  household.guests.every((g) => g.invitedEventIds.includes(e.id))
                return (
                  <th key={e.id} className="pb-2 px-2 text-center font-normal">
                    <button type="button"
                      title={`Click to ${allIn ? 'uninvite' : 'invite'} the whole household ${allIn ? 'from' : 'to'} ${e.name}`}
                      onClick={() => toggleColumn(e.id, !allIn)}
                      className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[12px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
                      <span className="h-2 w-2 rounded-full" style={{ background: e.accent ?? 'var(--accent)' }} />
                      {e.name}
                    </button>
                  </th>
                )
              })}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {household.guests.length === 0 && (
              <tr><td colSpan={events.length + 2} className="py-3 text-ink-3">No guests yet.</td></tr>
            )}
            {household.guests.map((g) => (
              <GuestRow key={`${g.id}:${g.invitedEventIds.join('.')}`} guest={g} events={events} onChanged={onChanged} />
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
      {events.map((e) => {
        const on = invited.has(e.id)
        return (
          <td key={e.id} className="px-2 py-2.5 text-center">
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-label={`${guest.fullName} invited to ${e.name}`}
              onClick={() => toggle(e.id)}
              className={`inline-flex h-5 w-5 items-center justify-center !rounded-[6px] text-[11px] leading-none transition-colors ${
                on ? 'bg-accent text-white' : 'border-[1.5px] border-line-2 bg-transparent hover:border-accent'
              }`}
            >
              {on ? '✓' : ''}
            </button>
          </td>
        )
      })}
      <td className="text-right">
        <button type="button" aria-label={`Archive ${guest.fullName}`}
          onClick={async () => {
            if (!(await askConfirm({ title: `Archive ${guest.fullName}?`, body: 'They leave the guest list and event invitations. Nothing is deleted.' }))) return
            await archiveGuest(guest.id)
            notify(`${guest.fullName} archived`, {
              actionLabel: 'Undo',
              onAction: () => { restoreArchived('guests', guest.id).then(onChanged) },
            })
            onChanged()
          }}
          className="rounded-md font-mono text-[9px] uppercase text-ink-3 hover:text-bad">
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
