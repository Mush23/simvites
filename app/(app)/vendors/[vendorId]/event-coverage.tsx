'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setVendorEvent } from '../actions'

export function EventCoverage({ vendorId, events }: {
  vendorId: string
  events: { id: string; name: string; meta: string; covered: boolean }[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [state, setState] = useState<Record<string, boolean>>(
    () => Object.fromEntries(events.map((e) => [e.id, e.covered])),
  )

  async function toggle(eventId: string) {
    const next = !state[eventId]
    setState((s) => ({ ...s, [eventId]: next }))
    const res = await setVendorEvent(vendorId, eventId, next)
    if (res?.error) setState((s) => ({ ...s, [eventId]: !next }))
    else startTransition(() => router.refresh())
  }

  if (!events.length) return <p className="text-sm text-ink-3">No events yet.</p>

  return (
    <div className="space-y-2">
      {events.map((e) => (
        <label key={e.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={state[e.id]} onChange={() => toggle(e.id)}
            className="h-4.5 w-4.5 accent-[var(--accent)]" />
          <span className="text-ink">{e.name}</span>
          <span className="ml-auto font-sans text-[12px] uppercase tracking-[0.14em] text-ink-3">{e.meta}</span>
        </label>
      ))}
    </div>
  )
}
