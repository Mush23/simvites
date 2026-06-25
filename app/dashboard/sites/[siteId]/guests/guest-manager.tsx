'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addGuest, addHousehold, setHouseholdInvite } from './actions'
import { generateInviteLink, sendInvitation } from './invite-actions'

export interface ManagedEvent {
  id: string
  name: string
}
export interface ManagedGuest {
  id: string
  name: string
  isChild: boolean
}
export interface ManagedHousehold {
  id: string
  name: string
  code: string
  guests: ManagedGuest[]
  invites: Record<string, { invited: boolean; cap: number }>
}

export function GuestManager({
  siteId,
  events,
  households,
}: {
  siteId: string
  events: ManagedEvent[]
  households: ManagedHousehold[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const refresh = () => startTransition(() => router.refresh())

  async function onAddHousehold(formData: FormData) {
    setError(null)
    const res = await addHousehold(siteId, formData)
    if (res?.error) setError(res.error)
    else refresh()
  }

  return (
    <div className="space-y-10">
      {/* Add household */}
      <section className="rounded-lg border border-border bg-secondary/30 p-6">
        <h2 className="mb-4 font-heading text-xl font-light">Add a household</h2>
        <form
          action={onAddHousehold}
          className="flex flex-wrap items-end gap-4"
        >
          <Field name="name" label="Household name" placeholder="The Patel Family" />
          <Field name="code" label="Invite code" placeholder="patel-family" />
          <Field name="email" label="Email (optional)" placeholder="patel@example.com" />
          <button
            type="submit"
            className="rounded-full bg-primary px-5 py-2.5 text-[0.7rem] uppercase tracking-wide-soft text-primary-foreground hover:opacity-90"
          >
            Add
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </section>

      {households.length === 0 && (
        <p className="text-sm text-muted-foreground">No households yet.</p>
      )}

      {households.map((h) => (
        <HouseholdCard
          key={h.id}
          siteId={siteId}
          household={h}
          events={events}
          onChanged={refresh}
        />
      ))}
    </div>
  )
}

function HouseholdCard({
  siteId,
  household,
  events,
  onChanged,
}: {
  siteId: string
  household: ManagedHousehold
  events: ManagedEvent[]
  onChanged: () => void
}) {
  const [link, setLink] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onAddGuest(formData: FormData) {
    await addGuest(siteId, household.id, formData)
    onChanged()
  }

  async function onGenerateLink() {
    setBusy(true)
    setNote(null)
    const res = await generateInviteLink(siteId, household.id)
    setBusy(false)
    if ('error' in res && res.error) setNote(res.error)
    else setLink((res as { link: string }).link)
  }

  async function onSend() {
    setBusy(true)
    setNote(null)
    const res = await sendInvitation(siteId, household.id)
    setBusy(false)
    if ('error' in res && res.error) setNote(res.error)
    else setNote((res as { note?: string }).note ?? 'Sent.')
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="font-heading text-xl font-light text-card-foreground">{household.name}</h3>
        <span className="text-[0.7rem] uppercase tracking-wide-soft text-muted-foreground">
          code: {household.code}
        </span>
      </div>

      {/* Guests */}
      <div className="mt-4">
        <p className="mb-2 text-[0.7rem] uppercase tracking-wide-soft text-gold-ink">Guests</p>
        {household.guests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No guests added.</p>
        ) : (
          <ul className="space-y-1 text-sm text-card-foreground">
            {household.guests.map((g) => (
              <li key={g.id}>
                {g.name}
                {g.isChild && <span className="ml-2 text-xs text-muted-foreground">(child)</span>}
              </li>
            ))}
          </ul>
        )}
        <form action={onAddGuest} className="mt-3 flex flex-wrap items-end gap-3">
          <Field name="name" label="Add guest" placeholder="Aarav Patel" small />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" name="is_child" /> Child
          </label>
          <button
            type="submit"
            className="rounded-full border border-border px-4 py-2 text-[0.65rem] uppercase tracking-wide-soft hover:border-gold hover:text-gold-ink"
          >
            Add guest
          </button>
        </form>
      </div>

      {/* Invite matrix */}
      <div className="mt-6">
        <p className="mb-2 text-[0.7rem] uppercase tracking-wide-soft text-gold-ink">
          Invited events &amp; capacity
        </p>
        <div className="space-y-2">
          {events.map((ev) => (
            <InviteRow
              key={ev.id}
              siteId={siteId}
              householdId={household.id}
              event={ev}
              invite={household.invites[ev.id] ?? { invited: false, cap: 0 }}
              onChanged={onChanged}
            />
          ))}
        </div>
      </div>

      {/* Invitation link / send */}
      <div className="mt-6 border-t border-border pt-4">
        <p className="mb-2 text-[0.7rem] uppercase tracking-wide-soft text-gold-ink">Invitation</p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onGenerateLink}
            disabled={busy}
            className="rounded-full border border-border px-4 py-2 text-[0.65rem] uppercase tracking-wide-soft hover:border-gold hover:text-gold-ink disabled:opacity-50"
          >
            {link ? 'Regenerate link' : 'Generate invite link'}
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={busy}
            className="rounded-full border border-border px-4 py-2 text-[0.65rem] uppercase tracking-wide-soft hover:border-gold hover:text-gold-ink disabled:opacity-50"
          >
            Email invite
          </button>
        </div>
        {link && (
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-3 w-full rounded border border-border bg-secondary/40 px-3 py-2 text-xs text-foreground outline-none"
          />
        )}
        {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
      </div>
    </section>
  )
}

function InviteRow({
  siteId,
  householdId,
  event,
  invite,
  onChanged,
}: {
  siteId: string
  householdId: string
  event: ManagedEvent
  invite: { invited: boolean; cap: number }
  onChanged: () => void
}) {
  const [invited, setInvited] = useState(invite.invited)
  const [cap, setCap] = useState(invite.cap || 1)
  const [saving, setSaving] = useState(false)

  async function save(nextInvited: boolean, nextCap: number) {
    setSaving(true)
    await setHouseholdInvite(siteId, householdId, event.id, nextInvited, nextCap)
    setSaving(false)
    onChanged()
  }

  return (
    <div className="flex items-center gap-4">
      <label className="flex min-w-44 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={invited}
          onChange={(e) => {
            setInvited(e.target.checked)
            save(e.target.checked, cap)
          }}
        />
        {event.name}
      </label>
      {invited && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          cap
          <input
            type="number"
            min={1}
            value={cap}
            onChange={(e) => setCap(Number(e.target.value))}
            onBlur={() => save(true, cap)}
            className="w-16 border-b border-border bg-transparent px-1 py-0.5 text-foreground outline-none"
          />
        </label>
      )}
      {saving && <span className="text-[0.6rem] uppercase tracking-wide-soft text-muted-foreground">saving…</span>}
    </div>
  )
}

function Field({
  name,
  label,
  placeholder,
  small,
}: {
  name: string
  label: string
  placeholder?: string
  small?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.65rem] uppercase tracking-wide-soft text-muted-foreground">
        {label}
      </span>
      <input
        name={name}
        type="text"
        placeholder={placeholder}
        className={`border-b border-border bg-transparent pb-1.5 text-foreground outline-none ${small ? 'w-44' : 'w-52'}`}
      />
    </label>
  )
}
