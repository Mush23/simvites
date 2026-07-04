'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateHouseholdLink, revokeLinks, sendInvitation } from './actions'

export interface HouseholdInviteRow {
  id: string
  name: string
  guestCount: number
  emailCount: number
  activeLinks: number
  lastSentAt: string | null
}

export function InvitationsClient({ rows }: { rows: HouseholdInviteRow[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const refresh = () => startTransition(() => router.refresh())

  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line bg-paper-2 p-10 text-center text-ink-2">
        Add households and guests first — then generate their links here.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <HouseholdRow key={r.id} row={r} onChanged={refresh} />
      ))}
    </div>
  )
}

function HouseholdRow({ row, onChanged }: { row: HouseholdInviteRow; onChanged: () => void }) {
  const [link, setLink] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function onGenerate() {
    setBusy(true); setNote(null)
    const res = await generateHouseholdLink(row.id)
    setBusy(false)
    if ('error' in res && res.error) setNote(res.error)
    else { setLink((res as { link: string }).link); onChanged() }
  }

  async function onSend() {
    setBusy(true); setNote(null)
    const res = await sendInvitation(row.id)
    setBusy(false)
    if ('error' in res && res.error) setNote(res.error)
    else {
      const ok = res as { link: string; note?: string }
      setLink(ok.link)
      setNote(ok.note ?? 'Sent.')
      onChanged()
    }
  }

  async function onRevoke() {
    if (!confirm(`Invalidate every link previously shared with ${row.name}?`)) return
    setBusy(true)
    await revokeLinks(row.id)
    setBusy(false)
    setLink(null)
    setNote('All previous links revoked.')
    onChanged()
  }

  async function copy() {
    if (!link) return
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }

  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-xl text-ink">{row.name}</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            {row.guestCount} guests · {row.emailCount} emails · {row.activeLinks} active link{row.activeLinks === 1 ? '' : 's'}
            {row.lastSentAt && ` · sent ${new Date(row.lastSentAt).toLocaleDateString('en-GB')}`}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={onGenerate} disabled={busy}
            className="rounded-md border border-line bg-paper-2 px-4 py-2 text-sm transition-colors hover:border-accent disabled:opacity-50">
            Generate link
          </button>
          <button type="button" onClick={onSend} disabled={busy || row.emailCount === 0}
            title={row.emailCount === 0 ? 'No guest emails in this household' : undefined}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-px disabled:opacity-50">
            Email invite
          </button>
          {row.activeLinks > 0 && (
            <button type="button" onClick={onRevoke} disabled={busy}
              className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3 hover:text-bad">
              Revoke
            </button>
          )}
        </div>
      </div>

      {link && (
        <div className="mt-3 flex items-center gap-2">
          <input readOnly value={link} onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-md border border-line bg-paper-2 px-3 py-2 font-mono text-xs text-ink outline-none" />
          <button type="button" onClick={copy}
            className="shrink-0 rounded-md border border-line bg-paper-2 px-3 py-2 text-sm hover:border-accent">
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
      )}
      {note && <p className="mt-2 text-sm text-ink-2">{note}</p>}
    </section>
  )
}
