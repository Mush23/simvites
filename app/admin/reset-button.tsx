'use client'

import { useState } from 'react'
import { adminResetPassword } from './actions'

export function ResetButton({ userId }: { userId: string }) {
  const [out, setOut] = useState<string | null>(null)
  return out ? (
    <code className="select-all rounded-md bg-paper-2 px-2 py-1 font-mono text-[11px] text-accent-ink">{out}</code>
  ) : (
    <button type="button" title="Set a one-time temporary password to give this user"
      onClick={async () => { const r = await adminResetPassword(userId); setOut(r.temp ?? r.error ?? 'failed') }}
      className="rounded-md border border-line bg-paper-2 px-3 py-1.5 text-xs hover:border-accent">
      Reset password
    </button>
  )
}
