'use client'

import { useState } from 'react'
import { updateEvent, archiveEvent } from '../actions'
import { askConfirm, notify } from '@/components/ui/overlays'

interface EventRow {
  id: string
  name: string
  starts_at: string | null
  ends_at: string | null
  rsvp_deadline: string | null
  venue_name: string | null
  address: string | null
  description: string | null
  dress_code: string | null
  host_side: string | null
  visibility: string
  capacity: number | null
  on_website: boolean
}

// timestamptz → value for <input type=datetime-local> (local, no seconds)
function toLocal(v: string | null) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EventForm({ event }: { event: EventRow }) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function action(formData: FormData) {
    setStatus('saving'); setError(null)
    const res = await updateEvent(event.id, formData)
    if (res?.error) { setError(res.error); setStatus('error') } else setStatus('saved')
  }

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Event name" name="name" defaultValue={event.name} required />
        <Field label="Venue" name="venue_name" defaultValue={event.venue_name ?? ''} />
        <Field label="Starts" name="starts_at" type="datetime-local" defaultValue={toLocal(event.starts_at)} />
        <Field label="Ends" name="ends_at" type="datetime-local" defaultValue={toLocal(event.ends_at)} />
        <Field label="Address" name="address" defaultValue={event.address ?? ''} />
        <Field label="Dress code" name="dress_code" defaultValue={event.dress_code ?? ''} />
        <Field label="Host side" name="host_side" defaultValue={event.host_side ?? ''} />
        <label className="block">
          <span className="eyebrow mb-1.5 block">Visibility</span>
          <select
            name="visibility" defaultValue={event.visibility}
            className="w-full rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent"
          >
            <option value="invite_only">Invite only</option>
            <option value="public">Public</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
        <Field label="Capacity (blank = uncapped)" name="capacity" type="number" defaultValue={event.capacity?.toString() ?? ''} />
        <Field label="RSVP deadline (blank = site default)" name="rsvp_deadline" type="datetime-local" defaultValue={toLocal(event.rsvp_deadline)} />
      </div>

      <label className="block">
        <span className="eyebrow mb-1.5 block">Description</span>
        <textarea
          name="description" rows={3} defaultValue={event.description ?? ''}
          className="w-full rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" name="on_website" defaultChecked={event.on_website} /> Show on the public website
      </label>

      <div className="flex items-center gap-4 pt-2">
        <button type="submit" className="rounded-md bg-accent px-6 py-3 font-semibold text-white">
          Save changes
        </button>
        {status === 'saved' && <span className="eyebrow text-accent-ink">Saved</span>}
        {status === 'saving' && <span className="eyebrow">Saving…</span>}
        {error && <span className="text-sm text-bad">{error}</span>}
        <button
          type="button"
          onClick={async () => {
            if (!(await askConfirm({ title: `Archive ${event.name}?`, body: 'It disappears from your site and guest invitations, but nothing is deleted.' }))) return
            notify('Event archived'); archiveEvent(event.id)
          }}
          className="ml-auto text-[12.5px] font-medium text-ink-3 hover:text-bad"
        >
          Archive
        </button>
      </div>
    </form>
  )
}

function Field({ label, name, defaultValue, type = 'text', required }: {
  label: string; name: string; defaultValue: string; type?: string; required?: boolean
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      <input
        name={name} type={type} defaultValue={defaultValue} required={required}
        className="w-full rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent"
      />
    </label>
  )
}
