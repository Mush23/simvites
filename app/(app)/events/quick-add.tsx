'use client'

import { useState } from 'react'
import { createEvent } from './actions'

export function QuickAddEvent() {
  const [error, setError] = useState<string | null>(null)

  async function action(formData: FormData) {
    setError(null)
    const res = await createEvent(formData)
    if (res?.error) setError(res.error)
    // success redirects to the new event (server action).
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
      <label className="block">
        <span className="eyebrow mb-1.5 block">Event name</span>
        <input
          name="name" required placeholder="Sangeet"
          className="w-52 rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-selected"
        />
      </label>
      <label className="block">
        <span className="eyebrow mb-1.5 block">Starts (optional)</span>
        <input
          name="starts_at" type="datetime-local"
          className="rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-selected"
        />
      </label>
      <button
        type="submit"
        className="rounded-md bg-accent px-5 py-2.5 font-semibold text-white"
      >
        Add event
      </button>
      {error && <p className="w-full text-sm text-bad">{error}</p>}
    </form>
  )
}
