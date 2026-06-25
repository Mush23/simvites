'use client'

import { useState } from 'react'
import { createCheckout } from './billing-actions'

export function UpgradeButton({ siteId }: { siteId: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onClick() {
    setBusy(true)
    setError(null)
    const res = await createCheckout(siteId)
    if (res.url) {
      window.location.href = res.url
      return
    }
    setError(res.error ?? 'Could not start checkout.')
    setBusy(false)
  }

  return (
    <span className="flex flex-col items-end">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="text-[0.7rem] uppercase tracking-wide-soft text-gold-ink underline underline-offset-4 disabled:opacity-50"
      >
        {busy ? 'Starting…' : 'Upgrade'}
      </button>
      {error && <span className="mt-1 max-w-44 text-right text-[0.6rem] text-muted-foreground">{error}</span>}
    </span>
  )
}
