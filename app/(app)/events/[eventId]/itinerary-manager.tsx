'use client'

// Per-event itinerary manager — the running order guests see for the day.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, ArrowDown, X, Plus } from 'lucide-react'
import { addItineraryItem, deleteItineraryItem, moveItineraryItem } from '../itinerary-actions'
import { notify } from '@/components/ui/overlays'

export interface ItineraryItem {
  id: string; time_label: string | null; title: string; note: string | null; sort_order: number
}

export function ItineraryManager({ eventId, items }: { eventId: string; items: ItineraryItem[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const refresh = () => startTransition(() => router.refresh())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onAdd(fd: FormData) {
    setBusy(true); setError(null)
    const res = await addItineraryItem(eventId, fd)
    setBusy(false)
    if (res.error) setError(res.error)
    else { const form = document.getElementById('itin-form') as HTMLFormElement | null; form?.reset(); refresh() }
  }

  return (
    <div className="rounded-card border border-line bg-surface p-6 shadow-card">
      <p className="text-[15px] font-semibold tracking-tight text-ink">Running order</p>
      <p className="mt-1 text-[13px] text-ink-2">The timed plan for the day. Guests see this under this event on your website.</p>

      <div className="mt-5 space-y-2">
        {items.length === 0 && <p className="text-[13px] text-ink-3">No moments yet — add the first below.</p>}
        {items.map((it, i) => (
          <div key={it.id} className="flex items-center gap-3 rounded-lg border border-line bg-paper px-3.5 py-2.5">
            <span className="w-20 shrink-0 font-mono text-[12px] font-medium text-accent-ink">{it.time_label ?? '—'}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium text-ink">{it.title}</p>
              {it.note && <p className="text-[12px] text-ink-3">{it.note}</p>}
            </div>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={async () => { await moveItineraryItem(it.id, eventId, 'up'); refresh() }}
                disabled={i === 0} aria-label="Move up"
                className="flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink disabled:opacity-30">
                <ArrowUp size={14} strokeWidth={1.8} />
              </button>
              <button type="button" onClick={async () => { await moveItineraryItem(it.id, eventId, 'down'); refresh() }}
                disabled={i === items.length - 1} aria-label="Move down"
                className="flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink disabled:opacity-30">
                <ArrowDown size={14} strokeWidth={1.8} />
              </button>
              <button type="button" onClick={async () => { await deleteItineraryItem(it.id, eventId); notify('Removed'); refresh() }}
                aria-label={`Delete ${it.title}`}
                className="flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-bad-soft hover:text-bad">
                <X size={14} strokeWidth={1.7} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <form id="itin-form" action={onAdd} className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-ink-2">Time</span>
          <input name="time_label" placeholder="4:00 PM"
            className="w-28 rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-accent" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-ink-2">Moment</span>
          <input name="title" required placeholder="Baraat arrival"
            className="w-52 rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-accent" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-ink-2">Note (optional)</span>
          <input name="note" placeholder="Meet at the main gate"
            className="w-56 rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-accent" />
        </label>
        <button type="submit" disabled={busy}
          className="flex items-center gap-1.5 bg-accent px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
          <Plus size={14} strokeWidth={2} /> {busy ? 'Adding…' : 'Add'}
        </button>
        {error && <p className="w-full text-[13px] text-bad">{error}</p>}
      </form>
    </div>
  )
}
