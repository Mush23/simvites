'use client'

// 4a: the sites register — search + status chips solve the 200-site future,
// and every consequential action goes through askConfirm before it fires.

import { useState } from 'react'
import Link from 'next/link'
import { adminToggleUnlock, adminArchiveSite, adminExtendExpiry } from './actions'
import { askConfirm, notify } from '@/components/ui/overlays'

export interface RegisterRow {
  id: string
  title: string
  slug: string
  status: string
  isUnlocked: boolean
  archived: boolean
  ownerEmail: string | null
  joined: string
  expires: string
  counts: { events: number; guests: number; payments: number; messages: number }
  stdLive: boolean
}

type StatusFilter = 'all' | 'live' | 'draft' | 'archived'

export function SitesRegister({ rows }: { rows: RegisterRow[] }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')

  const bucket = (r: RegisterRow): Exclude<StatusFilter, 'all'> =>
    r.archived ? 'archived' : r.status === 'published' ? 'live' : 'draft'
  const counts = {
    all: rows.length,
    live: rows.filter((r) => bucket(r) === 'live').length,
    draft: rows.filter((r) => bucket(r) === 'draft').length,
    archived: rows.filter((r) => bucket(r) === 'archived').length,
  }
  const needle = q.trim().toLowerCase()
  const shown = rows.filter((r) => {
    if (filter !== 'all' && bucket(r) !== filter) return false
    if (!needle) return true
    return r.title.toLowerCase().includes(needle) || r.slug.toLowerCase().includes(needle) ||
      (r.ownerEmail ?? '').toLowerCase().includes(needle)
  })

  const chip = (active: boolean) =>
    `rounded-pill px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
      active ? 'bg-ink text-paper' : 'border border-line text-ink-2 hover:border-line-2'}`

  return (
    <section className="mt-9">
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Customers &amp; sites</h2>
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search couple, slug or email…"
          className="w-60 rounded-md border border-line bg-surface px-3 py-1.5 text-[12.5px] text-ink outline-none focus:border-accent" />
        <span className="flex gap-1.5">
          {(['all', 'live', 'draft', 'archived'] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={chip(filter === f)}>
              {f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)} {counts[f]}
            </button>
          ))}
        </span>
      </div>

      <div className="space-y-2.5">
        {shown.map((s) => (
          <div key={s.id} className={`rounded-card border border-line bg-surface p-4 shadow-card ${s.archived ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-52 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[16px] text-ink">{s.title}</span>
                  <span className={`rounded-pill px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] ${
                    s.archived ? 'bg-bad-soft text-bad' : s.status === 'published' ? 'bg-ok-soft text-ok' : 'bg-surface-2 text-ink-3'}`}>
                    {s.archived ? 'archived' : s.status}
                  </span>
                  {s.isUnlocked && <span className="rounded-pill bg-accent-soft px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-accent-ink">paid</span>}
                </div>
                <p className="mt-0.5 text-[12px] text-ink-3">
                  {s.ownerEmail ?? 'no owner email'} · <span className="font-mono">{s.slug}</span> · joined {s.joined} · expires {s.expires}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-ink-3">
                  <span>{s.counts.events} events</span>
                  <span>{s.counts.guests} guests</span>
                  <span>{s.counts.payments} payments</span>
                  <span>{s.counts.messages} messages</span>
                  {s.stdLive && <span className="text-accent-ink">save-the-date live</span>}
                </div>
              </div>
              <SiteActions site={s} />
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-[13px] text-ink-3">No sites yet.</p>}
        {rows.length > 0 && shown.length === 0 && (
          <p className="text-[13px] text-ink-3">Nothing matches{needle ? ` “${q.trim()}”` : ''}.</p>
        )}
      </div>
    </section>
  )
}

/** Consequential admin actions — each one states what it does and confirms
 * before firing (they touch paying couples). */
function SiteActions({ site }: { site: RegisterRow }) {
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<unknown>, done: string) {
    setBusy(true)
    try { await fn(); notify(done) } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/s/${site.slug}`} target="_blank"
        className="rounded-lg border border-line bg-paper-2 px-3 py-1.5 text-xs font-medium text-ink hover:border-line-2">
        View site ↗
      </Link>
      {site.isUnlocked ? (
        <button type="button" disabled={busy} title="Publishing and invitation sending lock again"
          onClick={async () => {
            if (!(await askConfirm({
              title: `Revoke unlock for ${site.title}?`,
              body: 'Their site stays built and their data is safe, but publishing and invitation sending lock again immediately. They would need to pay to re-unlock.',
              confirmLabel: 'Revoke unlock',
            }))) return
            run(() => adminToggleUnlock(site.id, false), `Unlock revoked for ${site.title}`)
          }}
          className="rounded-lg border border-bad/40 bg-transparent px-3 py-1.5 text-xs font-medium text-bad hover:bg-bad-soft disabled:opacity-50">
          Revoke unlock…
        </button>
      ) : (
        <button type="button" disabled={busy} title="Comp the paid unlock (a 100% discount)"
          onClick={async () => {
            if (!(await askConfirm({
              title: `Comp unlock for ${site.title}?`,
              body: 'Publishing and invitation sending switch on immediately, free of charge — exactly as if they had paid.',
              confirmLabel: 'Comp unlock',
              destructive: false,
            }))) return
            run(() => adminToggleUnlock(site.id, true), `${site.title} unlocked (comped)`)
          }}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          Comp unlock…
        </button>
      )}
      <button type="button" disabled={busy} title="Extend hosting 18 months from today"
        onClick={async () => {
          if (!(await askConfirm({
            title: `Extend ${site.title} by 18 months?`,
            body: 'Hosting expiry moves to 18 months from today, and the site is restored if it was archived.',
            confirmLabel: 'Extend hosting',
            destructive: false,
          }))) return
          run(() => adminExtendExpiry(site.id, 18), `${site.title} extended 18 months`)
        }}
        className="rounded-lg border border-line bg-paper-2 px-3 py-1.5 text-xs font-medium hover:border-line-2 disabled:opacity-50">
        +18 months
      </button>
      {site.archived ? (
        <button type="button" disabled={busy} title="The public site comes back online"
          onClick={async () => {
            if (!(await askConfirm({
              title: `Restore ${site.title}?`,
              body: 'Their public site comes back online at the same link.',
              confirmLabel: 'Restore site',
              destructive: false,
            }))) return
            run(() => adminArchiveSite(site.id, false), `${site.title} restored`)
          }}
          className="rounded-lg border border-line bg-paper-2 px-3 py-1.5 text-xs font-medium hover:border-line-2 disabled:opacity-50">
          Restore…
        </button>
      ) : (
        <button type="button" disabled={busy} title="The public site goes offline; all data is kept"
          onClick={async () => {
            if (!(await askConfirm({
              title: `Archive ${site.title}?`,
              body: 'Their public site goes offline immediately. All data is kept and you can restore it from here any time.',
              confirmLabel: 'Archive site',
            }))) return
            run(() => adminArchiveSite(site.id, true), `${site.title} archived`)
          }}
          className="rounded-lg border border-line bg-paper-2 px-3 py-1.5 text-xs font-medium hover:border-line-2 disabled:opacity-50">
          Archive…
        </button>
      )}
    </div>
  )
}
