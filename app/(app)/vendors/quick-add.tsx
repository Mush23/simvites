'use client'

import { useState } from 'react'
import { createVendor } from './actions'

const CATEGORIES = ['Venue', 'Caterer', 'Photographer', 'Videographer', 'Decor', 'DJ / Band', 'Mehndi artist', 'Makeup & hair', 'Transport', 'Priest / Officiant', 'Cake', 'Stationery', 'Other']

export function QuickAddVendor() {
  const [error, setError] = useState<string | null>(null)

  async function action(fd: FormData) {
    setError(null)
    const res = await createVendor(fd)
    if (res?.error) setError(res.error)
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
      <label className="block">
        <span className="eyebrow mb-1.5 block">Vendor name</span>
        <input name="name" required placeholder="Golden Gate Catering"
          className="w-56 rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-selected" />
      </label>
      <label className="block">
        <span className="eyebrow mb-1.5 block">Category</span>
        <select name="category" defaultValue="Caterer"
          className="rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-selected">
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <button type="submit"
        className="rounded-md bg-accent px-5 py-2.5 font-semibold text-white">
        Add vendor
      </button>
      {error && <p className="w-full text-sm text-bad">{error}</p>}
    </form>
  )
}
