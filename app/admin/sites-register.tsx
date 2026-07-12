'use client'

// 4b: sites as a real table — one scannable row per site (status, unlock,
// guests, RSVPs in, last activity), every action behind a ⋯ menu with the
// 4a askConfirm guardrails. Search + status chips solve the 200-site future.

import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { adminToggleUnlock, adminArchiveSite, adminExtendExpiry, adminResetPassword } from './actions'
import { askConfirm, notify } from '@/components/ui/overlays'

export interface RegisterRow {
  id: string
  title: string
  slug: string
  status: string
  isUnlocked: boolean
  archived: boolean
  ownerEmail: string | null
  ownerId: string | null
  joined: string
  expires: string
  counts: { events: number; guests: number; payments: number; messages: number }
  rsvps: number
  lastRsvp: string | null
  stdLive: boolean
}

type StatusFilter = 'all' | 'live' | 'draft' | 'archived'

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-GB')
}

const COLS = { gridTemplateColumns: 'minmax(200px,2fr) 96px 92px 70px 80px 100px 40px' }

export function SitesRegister({ rows }: { rows: RegisterRow[] }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [menuId, setMenuId] = useState<string | null>(null)

  const bucket = (r: RegisterRow): Exclude<StatusFilter, 'all'> =>
    r.archived ? 'archived' : r.status === 'published' ? 'live' : 'draft'
  const counts = {
    all: rows.length,
    live: rows.filter((r) => bucket(r) === 'live').length,
    draft: rows.filter((r) => bucket(r) === 'draft').length,
    archived: rows.filter((r) => bucket(r) === 'archived').length,
  }
  const unlocked = rows.filter((r) => r.isUnlocked).length
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
        <h2 className="text-lg font-semibold tracking-tight text-ink">Sites</h2>
        <span className="font-mono text-[10.5px] text-ink-3 nums">
          {rows.length} total · {unlocked} unlocked · {counts.live} live
        </span>
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search couple, slug or email…"
          className="ml-auto w-56 rounded-md border border-line bg-surface px-3 py-1.5 text-[12.5px] text-ink outline-none focus:border-accent" />
        <span className="flex gap-1.5">
          {(['all', 'live', 'draft', 'archived'] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={chip(filter === f)}>
              {f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)} {counts[f]}
            </button>
          ))}
        </span>
        <a href="/admin/export"
          className="rounded-md border border-line bg-surface px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-line-2">
          Export CSV
        </a>
      </div>

      <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
        <div className="min-w-[720px]">
          <div style={COLS} className="grid items-center gap-x-3 border-b border-line px-4 py-2.5">
            {['Site', 'Status', 'Unlock', 'Guests', 'RSVPs in', 'Last RSVP', ''].map((h, i) => (
              <span key={h || 'menu'} className={`microlabel ${i === 3 || i === 4 ? 'text-right' : ''}`}>{h}</span>
            ))}
          </div>

          {shown.map((s) => (
            <div key={s.id}
              className={`relative grid items-center gap-x-3 border-t border-line px-4 py-2.5 first-of-type:border-t-0 ${
                s.archived ? 'opacity-60' : ''} ${menuId === s.id ? 'bg-surface-2' : ''}`}
              style={COLS}>
              <span className="min-w-0">
                <span className="font-display text-[14.5px] text-ink">{s.title}</span>{' '}
                <span className="font-mono text-[10px] text-ink-3">{s.slug}{s.stdLive ? ' · std live' : ''}</span>
              </span>
              <span className="flex items-center gap-1.5 text-[11.5px] text-ink-2">
                <span className={`h-1.5 w-1.5 rounded-full ${
                  s.archived ? 'bg-bad' : s.status === 'published' ? 'bg-ok' : 'bg-warn'}`} />
                {s.archived ? 'Archived' : s.status === 'published' ? 'Live' : 'Draft'}
              </span>
              <span className={`text-[11.5px] font-medium ${s.isUnlocked ? 'text-ok' : 'text-ink-3'}`}>
                {s.isUnlocked ? 'Unlocked ✓' : '—'}
              </span>
              <span className="text-right font-mono text-[12px] text-ink nums">{s.counts.guests}</span>
              <span className="text-right font-mono text-[12px] text-ink nums">{s.rsvps}</span>
              <span suppressHydrationWarning className="text-[11.5px] text-ink-3">{timeAgo(s.lastRsvp)}</span>
              <button type="button" aria-label={`Actions for ${s.title}`} aria-expanded={menuId === s.id}
                onClick={() => setMenuId(menuId === s.id ? null : s.id)}
                className={`flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-paper-2 hover:text-ink ${
                  menuId === s.id ? 'bg-paper-2 text-ink' : ''}`}>
                <MoreHorizontal size={15} strokeWidth={1.7} />
              </button>

              {menuId === s.id && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuId(null)} />
                  <SiteMenu site={s} onClose={() => setMenuId(null)} />
                </>
              )}
            </div>
          ))}
          {rows.length === 0 && <p className="p-4 text-[13px] text-ink-3">No sites yet.</p>}
          {rows.length > 0 && shown.length === 0 && (
            <p className="p-4 text-[13px] text-ink-3">Nothing matches{needle ? ` “${q.trim()}”` : ''}.</p>
          )}
        </div>
      </div>
    </section>
  )
}

/** The ⋯ menu: identity block + every consequential action, each stating
 * its consequence and confirming before it fires (4a guardrails). */
function SiteMenu({ site, onClose }: { site: RegisterRow; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  async function run(fn: () => Promise<unknown>, done: string) {
    setBusy(true)
    try { await fn(); notify(done) } finally { setBusy(false); onClose() }
  }

  const item = 'block w-full rounded-md px-2.5 py-2 text-left text-[12.5px] text-ink hover:bg-paper-2 disabled:opacity-50'

  return (
    <div className="absolute right-3 top-11 z-40 w-64 rounded-card border border-line bg-surface p-1.5 shadow-lift">
      <div className="border-b border-line px-2.5 pb-2 pt-1">
        <p className="text-[11.5px] text-ink-2">{site.ownerEmail ?? 'no owner email'}</p>
        <p className="font-mono text-[9.5px] text-ink-3">
          joined {site.joined} · expires {site.expires} · {site.counts.events} events · {site.counts.messages} messages
        </p>
      </div>

      {tempPassword ? (
        <div className="px-2.5 py-2">
          <p className="mb-1 text-[11.5px] text-ink-2">One-time password — hand it over yourself:</p>
          <code className="block select-all rounded-md bg-paper-2 px-2 py-1.5 text-center font-mono text-[12px] text-accent-ink">
            {tempPassword}
          </code>
          <button type="button" onClick={onClose}
            className="mt-2 w-full rounded-md border border-line px-2.5 py-1.5 text-[12px] font-medium text-ink hover:border-line-2">
            Done
          </button>
        </div>
      ) : (
        <>
          <a href={`/s/${site.slug}`} target="_blank" rel="noreferrer" className={item} onClick={onClose}>
            Open their site ↗
          </a>
          {site.isUnlocked ? (
            <button type="button" disabled={busy} className={`${item} text-bad hover:bg-bad-soft`}
              onClick={async () => {
                if (!(await askConfirm({
                  title: `Revoke unlock for ${site.title}?`,
                  body: 'Their site stays built and their data is safe, but publishing and invitation sending lock again immediately. They would need to pay to re-unlock.',
                  confirmLabel: 'Revoke unlock',
                }))) return
                run(() => adminToggleUnlock(site.id, false), `Unlock revoked for ${site.title}`)
              }}>
              Revoke unlock…
            </button>
          ) : (
            <button type="button" disabled={busy} className={item}
              onClick={async () => {
                if (!(await askConfirm({
                  title: `Comp unlock for ${site.title}?`,
                  body: 'Publishing and invitation sending switch on immediately, free of charge — exactly as if they had paid.',
                  confirmLabel: 'Comp unlock',
                  destructive: false,
                }))) return
                run(() => adminToggleUnlock(site.id, true), `${site.title} unlocked (comped)`)
              }}>
              Comp unlock…
            </button>
          )}
          <button type="button" disabled={busy} className={item}
            onClick={async () => {
              if (!(await askConfirm({
                title: `Extend ${site.title} by 18 months?`,
                body: 'Hosting expiry moves to 18 months from today, and the site is restored if it was archived.',
                confirmLabel: 'Extend hosting',
                destructive: false,
              }))) return
              run(() => adminExtendExpiry(site.id, 18), `${site.title} extended 18 months`)
            }}>
            Extend live window +18 months…
          </button>
          {site.ownerId && (
            <button type="button" disabled={busy} className={item}
              onClick={async () => {
                if (!(await askConfirm({
                  title: `Reset the password for ${site.ownerEmail ?? 'the owner'}?`,
                  body: 'A one-time temporary password is generated immediately and their current password stops working. Hand the new one over yourself.',
                  confirmLabel: 'Reset password',
                }))) return
                setBusy(true)
                const r = await adminResetPassword(site.ownerId!)
                setBusy(false)
                if (r.error) notify(r.error, { tone: 'warn' })
                else setTempPassword(r.temp ?? null)
              }}>
              Reset owner password…
            </button>
          )}
          {site.archived ? (
            <button type="button" disabled={busy} className={item}
              onClick={async () => {
                if (!(await askConfirm({
                  title: `Restore ${site.title}?`,
                  body: 'Their public site comes back online at the same link.',
                  confirmLabel: 'Restore site',
                  destructive: false,
                }))) return
                run(() => adminArchiveSite(site.id, false), `${site.title} restored`)
              }}>
              Restore…
            </button>
          ) : (
            <button type="button" disabled={busy} className={`${item} text-bad hover:bg-bad-soft`}
              onClick={async () => {
                if (!(await askConfirm({
                  title: `Archive ${site.title}?`,
                  body: 'Their public site goes offline immediately. All data is kept and you can restore it from here any time.',
                  confirmLabel: 'Archive site',
                }))) return
                run(() => adminArchiveSite(site.id, true), `${site.title} archived`)
              }}>
              Archive…
            </button>
          )}
        </>
      )}
    </div>
  )
}
