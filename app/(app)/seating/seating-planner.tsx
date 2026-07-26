'use client'

// Visual seating planner — arrange tables on a canvas (over an optional
// floor-plan image), drag to position, click a table to seat guests, and
// see names right on the plan. Falls back gracefully with no floor plan.

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Upload, ImageOff, Circle, Square } from 'lucide-react'
import { addTable, deleteTable, seatGuest, setTablePosition, setTableShape, setFloorplan } from './actions'
import { uploadSiteImage } from '@/app/(app)/website/actions'
import { askConfirm, notify } from '@/components/ui/overlays'

export interface PlannerTable {
  id: string; name: string; capacity: number; shape: string
  posX: number; posY: number; eventId: string | null
}
export interface PlannerGuest { id: string; name: string; household: string }
export interface PlannerEvent { id: string; name: string }

export function SeatingPlanner({ tables, seats, guests, events, floorplans }: {
  tables: PlannerTable[]
  seats: { table_id: string; guest_id: string }[]
  guests: PlannerGuest[]
  events: PlannerEvent[]
  floorplans: { event_id: string | null; image_url: string | null }[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const refresh = () => startTransition(() => router.refresh())
  const canvasRef = useRef<HTMLDivElement>(null)

  const [eventFilter, setEventFilter] = useState<string>('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>(
    () => Object.fromEntries(tables.map((t) => [t.id, { x: t.posX, y: t.posY }])),
  )
  const dragId = useRef<string | null>(null)
  // Live position during a drag — onPointerUp reads this, not `pos` state,
  // which can be stale if move→up happen within one render frame.
  const livePos = useRef<{ x: number; y: number } | null>(null)

  const shownTables = eventFilter === 'all' ? tables : tables.filter((t) => t.eventId === eventFilter || t.eventId === null)
  const floorUrl = (eventFilter === 'all'
    ? floorplans.find((f) => f.event_id === null)
    : floorplans.find((f) => f.event_id === eventFilter))?.image_url ?? null

  const seatsByTable = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const s of seats) { const a = m.get(s.table_id) ?? []; a.push(s.guest_id); m.set(s.table_id, a) }
    return m
  }, [seats])
  const guestById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests])
  const seatedIds = useMemo(() => new Set(seats.map((s) => s.guest_id)), [seats])
  const unseated = guests.filter((g) => !seatedIds.has(g.id))

  // ── drag ──
  function onPointerDown(e: React.PointerEvent, id: string) {
    e.preventDefault()
    dragId.current = id
    setSelected(id)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragId.current || !canvasRef.current) return
    const r = canvasRef.current.getBoundingClientRect()
    const x = Math.max(3, Math.min(97, ((e.clientX - r.left) / r.width) * 100))
    const y = Math.max(4, Math.min(96, ((e.clientY - r.top) / r.height) * 100))
    livePos.current = { x, y }
    setPos((p) => ({ ...p, [dragId.current!]: { x, y } }))
  }
  async function onPointerUp() {
    const id = dragId.current
    const p = livePos.current
    dragId.current = null
    livePos.current = null
    if (id && p) await setTablePosition(id, p.x, p.y)
  }

  async function onAddTable(fd: FormData) {
    if (eventFilter !== 'all') fd.set('event_id', eventFilter)
    const res = await addTable(fd)
    if (res.error) notify(res.error, { tone: 'warn' })
    else { const f = document.getElementById('add-table-form') as HTMLFormElement | null; f?.reset(); notify('Table added'); refresh() }
  }

  async function seat(guestId: string, tableId: string | null) {
    const res = await seatGuest(guestId, tableId)
    if (res.error) notify(res.error, { tone: 'warn' }); else refresh()
  }

  const sel = shownTables.find((t) => t.id === selected) ?? null
  const selSeated = sel ? (seatsByTable.get(sel.id) ?? []) : []

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {/* Canvas */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select value={eventFilter} onChange={(e) => { setEventFilter(e.target.value); setSelected(null) }}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] text-ink outline-none focus:border-selected">
            <option value="all">All events</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <FloorplanControls eventId={eventFilter === 'all' ? null : eventFilter} hasImage={!!floorUrl} onChange={refresh} />
          <span className="ml-auto text-[12px] text-ink-3">Drag tables to arrange the room</span>
        </div>

        <div ref={canvasRef}
          onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
          className="relative aspect-[4/3] w-full overflow-hidden rounded-card border border-line bg-paper-2"
          style={floorUrl ? { backgroundImage: `url(${floorUrl})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : undefined}>
          {!floorUrl && (
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.5]"
              style={{ backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          )}
          {shownTables.map((t) => {
            const p = pos[t.id] ?? { x: t.posX, y: t.posY }
            const n = (seatsByTable.get(t.id) ?? []).length
            const full = n >= t.capacity
            const isSel = selected === t.id
            return (
              <div key={t.id}
                onPointerDown={(e) => onPointerDown(e, t.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none select-none active:cursor-grabbing"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                <div className={`flex h-16 w-16 flex-col items-center justify-center border-2 text-center ${
                  t.shape === 'rect' ? 'rounded-md' : 'rounded-full'} ${
                  isSel ? 'border-accent' : full ? 'border-ok' : 'border-line-2'}`}
                  style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
                  <span className="max-w-[56px] truncate px-1 text-[10px] font-semibold text-ink">{t.name}</span>
                  <span className={`font-mono text-[10px] ${full ? 'text-ok' : 'text-ink-3'}`}>{n}/{t.capacity}</span>
                </div>
              </div>
            )
          })}
          {shownTables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-[13px] text-ink-3">
              Add a table to start arranging the room.
            </div>
          )}
        </div>

        <form id="add-table-form" action={onAddTable} className="mt-3 flex flex-wrap items-end gap-2">
          <input name="name" required placeholder="Table 1 / Top table"
            className="w-44 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-selected" />
          <input name="capacity" type="number" defaultValue={10} min={1}
            className="w-20 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-selected" />
          <button type="submit" className="rounded-md flex items-center gap-1.5 bg-accent px-3.5 py-2 text-[13px] font-semibold text-white">
            <Plus size={14} strokeWidth={2} /> Add table
          </button>
        </form>
      </div>

      {/* Right rail: selected table + unseated */}
      <div className="space-y-5">
        {sel ? (
          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[14.5px] font-semibold tracking-tight text-ink">{sel.name}</p>
                <p className="text-[12px] text-ink-3">{selSeated.length}/{sel.capacity} seated</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" title="Round table" onClick={async () => { await setTableShape(sel.id, 'round'); refresh() }}
                  className={`flex h-7 w-7 items-center justify-center rounded-md ${sel.shape === 'round' ? 'bg-accent-soft text-accent-ink' : 'text-ink-3 hover:bg-surface-2'}`}>
                  <Circle size={14} strokeWidth={1.8} />
                </button>
                <button type="button" title="Long table" onClick={async () => { await setTableShape(sel.id, 'rect'); refresh() }}
                  className={`flex h-7 w-7 items-center justify-center rounded-md ${sel.shape === 'rect' ? 'bg-accent-soft text-accent-ink' : 'text-ink-3 hover:bg-surface-2'}`}>
                  <Square size={14} strokeWidth={1.8} />
                </button>
                <button type="button" title="Delete table"
                  onClick={async () => { if (await askConfirm({ title: `Delete ${sel.name}?`, body: 'Its guests return to the unseated list.', confirmLabel: 'Delete' })) { await deleteTable(sel.id); setSelected(null); notify('Table deleted'); refresh() } }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-bad-soft hover:text-bad">
                  <X size={14} strokeWidth={1.7} />
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {selSeated.map((gid) => (
                <div key={gid} className="flex items-center justify-between rounded-md border border-line bg-paper px-2.5 py-1.5 text-[13px]">
                  <span className="text-ink">{guestById.get(gid)?.name ?? 'Guest'}</span>
                  <button type="button" onClick={() => seat(gid, null)} aria-label="Remove from table"
                    className="rounded-md text-ink-3 hover:text-bad"><X size={13} strokeWidth={1.8} /></button>
                </div>
              ))}
              {selSeated.length === 0 && <p className="text-[12.5px] text-ink-3">No one seated here yet — add from the list below.</p>}
            </div>
          </section>
        ) : (
          <section className="rounded-card border border-dashed border-line bg-paper-2 p-5 text-center text-[13px] text-ink-3">
            Click a table to seat guests.
          </section>
        )}

        <section className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="mb-2.5 text-[13px] font-semibold text-ink">Unseated · {unseated.length}</p>
          <div className="max-h-[320px] space-y-1.5 overflow-y-auto">
            {unseated.map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-md border border-line bg-paper px-2.5 py-1.5 text-[13px]">
                <span className="min-w-0"><span className="text-ink">{g.name}</span> <span className="text-ink-3">· {g.household}</span></span>
                <button type="button" disabled={!sel} onClick={() => sel && seat(g.id, sel.id)}
                  title={sel ? `Seat at ${sel.name}` : 'Select a table first'}
                  className="shrink-0 rounded-md border border-line px-2 py-0.5 text-[11.5px] font-medium text-accent-ink disabled:opacity-40">
                  Seat →
                </button>
              </div>
            ))}
            {unseated.length === 0 && <p className="text-[12.5px] text-ink-3">Everyone has a seat. 🎉</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

function FloorplanControls({ eventId, hasImage, onChange }: {
  eventId: string | null; hasImage: boolean; onChange: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <span className="flex items-center gap-1.5">
      <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12.5px] font-medium text-ink hover:border-line-2 ${busy ? 'opacity-60' : ''}`}>
        <Upload size={13} strokeWidth={1.7} className="text-ink-3" /> {busy ? 'Uploading…' : hasImage ? 'Replace plan' : 'Upload floor plan'}
        <input type="file" accept="image/*" className="hidden" disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return
            setBusy(true)
            const fd = new FormData(); fd.set('file', f)
            const up = await uploadSiteImage(fd)
            if (up.url) { await setFloorplan(eventId, up.url); notify('Floor plan set'); onChange() }
            else notify(up.error ?? 'Upload failed', { tone: 'warn' })
            setBusy(false); e.target.value = ''
          }} />
      </label>
      {hasImage && (
        <button type="button" title="Remove floor plan"
          onClick={async () => { await setFloorplan(eventId, null); notify('Floor plan removed'); onChange() }}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-3 hover:text-ink">
          <ImageOff size={14} strokeWidth={1.7} />
        </button>
      )}
    </span>
  )
}
