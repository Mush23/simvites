'use client'

import { useState } from 'react'
import { updateSiteSettings } from './actions'

function toLocal(v: string | null) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Template picker removed — choosing the look lives at /templates now, where
// it gets real previews instead of a radio button and three 8px dots.
export function SiteSettingsForm({ title, deadlineDefault }: {
  title: string
  deadlineDefault: string | null
}) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function action(fd: FormData) {
    setStatus('saving'); setError(null)
    const res = await updateSiteSettings(fd)
    if (res?.error) { setError(res.error); setStatus('error') } else setStatus('saved')
  }

  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="eyebrow mb-1.5 block">Site name</span>
        <input name="title" defaultValue={title} required
          className="w-full rounded-md border border-line bg-paper-2 px-3.5 py-3 text-ink outline-none focus:border-selected" />
      </label>
      <label className="block">
        <span className="eyebrow mb-1.5 block">RSVP deadline (site-wide default)</span>
        <input name="rsvp_deadline_default" type="datetime-local" defaultValue={toLocal(deadlineDefault)}
          className="w-full rounded-md border border-line bg-paper-2 px-3.5 py-3 text-ink outline-none focus:border-selected" />
        <span className="mt-1.5 block text-xs text-ink-3">
          Individual events can override this on their own page.
        </span>
      </label>
      <div className="flex items-center gap-4">
        <button type="submit"
          className="rounded-md bg-accent px-6 py-3 font-semibold text-white">
          Save
        </button>
        {status === 'saved' && <span className="eyebrow text-accent-ink">Saved</span>}
        {status === 'saving' && <span className="eyebrow">Saving…</span>}
        {error && <span className="text-sm text-bad">{error}</span>}
      </div>
    </form>
  )
}
