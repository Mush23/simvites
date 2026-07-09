'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminSetUnlockPrice } from './actions'
import { notify } from '@/components/ui/overlays'

/** E5: change the one-time unlock price without a deploy. */
export function PriceEditor({ currentPence }: { currentPence: number }) {
  const router = useRouter()
  const [pounds, setPounds] = useState((currentPence / 100).toFixed(0))
  const [busy, setBusy] = useState(false)

  async function save() {
    if (busy) return
    setBusy(true)
    const res = await adminSetUnlockPrice(Number(pounds))
    setBusy(false)
    if ('error' in res && res.error) { notify(res.error, { tone: 'warn' }); return }
    notify(`Unlock price is now £${pounds} for every new checkout`)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1 rounded-md border border-line bg-paper-2 px-2.5 py-1.5">
        <span className="text-[13px] text-ink-3">£</span>
        <input value={pounds} onChange={(e) => setPounds(e.target.value.replace(/[^\d.]/g, ''))}
          inputMode="decimal" className="w-16 bg-transparent text-[13.5px] font-semibold text-ink outline-none" />
      </label>
      <button type="button" onClick={save} disabled={busy || Number(pounds) * 100 === currentPence}
        className="bg-accent px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-40">
        {busy ? 'Saving…' : 'Set price'}
      </button>
    </div>
  )
}
