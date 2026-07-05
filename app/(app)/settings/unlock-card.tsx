'use client'

import { useState } from 'react'
import { startUnlockCheckout } from './actions'

export function UnlockCard({ unlocked, priceDisplay }: { unlocked: boolean; priceDisplay: string }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  async function onUnlock() {
    setBusy(true); setNote(null)
    const res = await startUnlockCheckout()
    if (res.url) { window.location.href = res.url; return }
    setNote(res.error ?? 'Could not start checkout.')
    setBusy(false)
  }

  if (unlocked) {
    return (
      <section className="rounded-card border border-line bg-surface p-7 shadow-card">
        <p className="eyebrow mb-4">Billing</p>
        <p className="text-lg font-semibold tracking-tight text-ink">Unlocked ✓</p>
        <p className="mt-3 text-ink-2">
          Publishing and invite sending are live for this site. One payment, the whole wedding — no subscription.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-card border border-accent-line bg-accent-soft/40 p-7 shadow-card">
      <p className="eyebrow mb-4">Billing</p>
      <p className="text-lg font-semibold tracking-tight text-ink">Unlock your command centre</p>
      <p className="mt-3 leading-relaxed text-ink-2">
        Build everything free — events, guests, budget, the whole site. One payment of{' '}
        <span className="font-display nums text-ink">{priceDisplay}</span> unlocks publishing your
        website and sending invitations. No subscription, yours for the whole wedding.
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-ink-2">
        <li>✓ Publish to your own address</li>
        <li>✓ Send personalised invitation emails</li>
        <li>✓ Everything else stays free forever</li>
      </ul>
      <button id="unlock-button" type="button" onClick={onUnlock} disabled={busy}
        className="mt-6 rounded-md bg-accent px-7 py-3 font-semibold text-white disabled:opacity-50">
        {busy ? 'Starting checkout…' : `Unlock for ${priceDisplay}`}
      </button>
      {note && <p className="mt-3 text-sm text-ink-2">{note}</p>}
    </section>
  )
}
