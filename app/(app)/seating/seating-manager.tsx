'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addTable, deleteTable, seatGuest } from './actions'
import { askConfirm, notify } from '@/components/ui/overlays'

interface TableRow { id: string; name: string; capacity: number; eventName: string | null }
interface GuestRow { id: string; name: string; household: string }

export function SeatingManager({ tables, seats, guests, events }: {
  tables: TableRow[]
  seats: { table_id: string; guest_id: string }[]
  guests: GuestRow[]
  events: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [, start] = useTransition()
  const refresh = () => start(() => router.refresh())
  const [error, setError] = useState<string | null>(null)

  const seatOf = new Map(seats.map((s) => [s.guest_id, s.table_id]))
  const atTable = (tid: string) => guests.filter((g) => seatOf.get(g.id) === tid)
  const unseated = guests.filter((g) => !seatOf.has(g.id))

  async function onAdd(fd: FormData) {
    setError(null)
    const res = await addTable(fd)
    if (res?.error) setError(res.error); else refresh()
  }
  async function onSeat(guestId: string, tableId: string | null) {
    setError(null)
    const res = await seatGuest(guestId, tableId)
    if (res?.error) setError(res.error); else refresh()
  }

  return (
    <div className="space-y-8">
      <form action={onAdd} className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
        <label className="block"><span className="eyebrow mb-1.5 block">New table</span>
          <input name="name" required placeholder="Table 1, Family, Friends of the bride"
            className="w-56 rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent" /></label>
        <label className="block"><span className="eyebrow mb-1.5 block">Seats</span>
          <input name="capacity" type="number" defaultValue={10} min={1}
            className="w-20 rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent" /></label>
        <label className="block"><span className="eyebrow mb-1.5 block">Event (optional)</span>
          <select name="event_id" defaultValue="" className="rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent">
            <option value="">Whole wedding</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select></label>
        <button type="submit" className="bg-accent px-5 py-2.5 font-semibold text-white">Add table</button>
        {error && <p className="w-full text-sm text-bad">{error}</p>}
      </form>

      <div className="grid gap-5 sm:grid-cols-2">
        {tables.map((t) => {
          const seated = atTable(t.id)
          return (
            <section key={t.id} className="rounded-card border border-line bg-surface p-5 shadow-card">
              <div className="flex items-baseline justify-between">
                <p className="text-[14.5px] font-semibold tracking-tight text-ink">{t.name}</p>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                  {seated.length}/{t.capacity}{t.eventName ? ` — ${t.eventName}` : ''}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {seated.map((g) => (
                  <li key={g.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink">{g.name} <span className="text-ink-3">({g.household})</span></span>
                    <button type="button" onClick={() => onSeat(g.id, null)} title="Remove from table"
                      className="font-mono text-[9px] uppercase text-ink-3 hover:text-bad">✕</button>
                  </li>
                ))}
                {seated.length === 0 && <li className="text-sm text-ink-3">Empty table.</li>}
              </ul>
              <button type="button" onClick={async () => {
                if (!(await askConfirm({ title: `Delete ${t.name}?`, body: 'Its guests return to the unseated list.', confirmLabel: 'Delete table' }))) return
                await deleteTable(t.id); notify('Table deleted'); refresh()
              }}
                className="mt-4 border border-line bg-paper-2 px-3 py-1.5 text-xs text-ink-3 hover:text-bad">Delete table</button>
            </section>
          )
        })}
      </div>

      <section className="rounded-card border border-line bg-surface p-5 shadow-card">
        <p className="eyebrow mb-3">Unseated guests: {unseated.length}</p>
        <div className="space-y-2">
          {unseated.map((g) => (
            <div key={g.id} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="min-w-40 text-ink">{g.name} <span className="text-ink-3">({g.household})</span></span>
              <select defaultValue="" onChange={(e) => e.target.value && onSeat(g.id, e.target.value)}
                title="Choose a table for this guest"
                className="rounded-md border border-line bg-paper-2 px-2 py-1.5 text-xs text-ink outline-none focus:border-accent">
                <option value="">Seat at…</option>
                {tables.map((t) => <option key={t.id} value={t.id}>{t.name} ({atTable(t.id).length}/{t.capacity})</option>)}
              </select>
            </div>
          ))}
          {unseated.length === 0 && guests.length > 0 && <p className="text-sm text-ink-2">Everyone has a seat. 🎉</p>}
        </div>
      </section>
    </div>
  )
}
