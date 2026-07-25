'use client'

// 4c ops widgets: the "Needs you" briefing rows and the type-to-confirm
// danger zone (GitHub-style — stronger than a dialog for the truly
// irreversible).

import { useState } from 'react'
import { adminExtendExpiry, adminArchiveSite } from './actions'
import { askConfirm, notify } from '@/components/ui/overlays'

export interface NeedsYouItem {
  siteId: string
  title: string
  text: string
  /** 'extend' shows the +18 months action; 'fyi' is informational. */
  kind: 'extend' | 'fyi'
}

export function NeedsYou({ items }: { items: NeedsYouItem[] }) {
  const [busy, setBusy] = useState(false)

  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <p className="microlabel mb-2.5">Needs you</p>
      {items.length === 0 && (
        <p className="text-[12.5px] text-ink-3">Nothing needs you right now. Enjoy the calm.</p>
      )}
      <div className="flex flex-col gap-2">
        {items.map((n) => (
          <div key={`${n.siteId}:${n.kind}`}
            className={`flex items-center gap-2.5 rounded-md border px-3 py-2 ${
              n.kind === 'extend' ? 'border-warn/25 bg-warn-soft' : 'border-line bg-paper-2'}`}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${n.kind === 'extend' ? 'bg-warn' : 'bg-accent'}`} />
            <span className="min-w-0 flex-1 text-[12.5px] text-ink">
              <span className="font-display">{n.title}</span> — {n.text}
            </span>
            {n.kind === 'extend' ? (
              <button type="button" disabled={busy}
                onClick={async () => {
                  if (!(await askConfirm({
                    title: `Extend ${n.title} by 18 months?`,
                    body: 'Hosting expiry moves to 18 months from today.',
                    confirmLabel: 'Extend hosting',
                    destructive: false,
                  }))) return
                  setBusy(true)
                  const res = await adminExtendExpiry(n.siteId, 18)
                  setBusy(false)
                  if (res?.error) notify(res.error, { tone: 'warn' })
                  else notify(`${n.title} extended 18 months`)
                }}
                className="shrink-0 rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-ink hover:border-line-2 disabled:opacity-50">
                +18 months…
              </button>
            ) : (
              <span className="shrink-0 text-[10.5px] text-ink-3">FYI</span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export function DangerZone({ sites }: { sites: { id: string; title: string; slug: string }[] }) {
  const [siteId, setSiteId] = useState('')
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const site = sites.find((s) => s.id === siteId) ?? null
  const armed = Boolean(site && typed.trim() === site.slug)

  async function archive() {
    if (!armed || !site || busy) return
    setBusy(true)
    const res = await adminArchiveSite(site.id, true)
    setBusy(false)
    if (res?.error) { notify(res.error, { tone: 'warn' }); return }
    notify(`${site.title} archived — restore it from the register any time`)
    setSiteId(''); setTyped('')
  }

  return (
    <section className="rounded-card border border-bad/30 bg-bad-soft/40 p-5">
      <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-bad">
        Danger zone · archive site
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-2">
        Archiving takes a couple&rsquo;s site offline for their guests immediately (data is kept).
        Pick the site, then type its slug to arm the button.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <select value={siteId} onChange={(e) => { setSiteId(e.target.value); setTyped('') }}
          className="min-w-40 flex-1 rounded-md border border-line bg-paper px-2.5 py-2 text-[12.5px] text-ink outline-none focus:border-bad">
          <option value="">Choose a site…</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <input value={typed} onChange={(e) => setTyped(e.target.value)}
          placeholder={site?.slug ?? 'type-the-slug'} disabled={!site} spellCheck={false}
          className="min-w-40 flex-1 rounded-md border border-line bg-paper px-3 py-2 font-mono text-[12px] text-ink outline-none focus:border-bad disabled:opacity-40" />
        <button type="button" onClick={archive} disabled={!armed || busy}
          className={`rounded-md px-4 py-2 text-[12px] font-semibold transition-colors ${
            armed ? 'bg-bad text-white' : 'bg-bad/25 text-ink-3'}`}>
          {busy ? 'Archiving…' : 'Archive'}
        </button>
      </div>
    </section>
  )
}
