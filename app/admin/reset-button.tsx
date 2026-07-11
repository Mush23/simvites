'use client'

import { useState } from 'react'
import { adminResetPassword } from './actions'
import { askConfirm } from '@/components/ui/overlays'

export function ResetButton({ userId, email }: { userId: string; email?: string }) {
  const [out, setOut] = useState<string | null>(null)
  return out ? (
    <code className="select-all rounded-md bg-paper-2 px-2 py-1 font-mono text-[11px] text-accent-ink">{out}</code>
  ) : (
    <button type="button" title="Set a one-time temporary password to give this user"
      onClick={async () => {
        if (!(await askConfirm({
          title: `Reset the password for ${email ?? 'this user'}?`,
          body: 'A one-time temporary password is generated immediately and their current password stops working. Hand the new one over yourself.',
          confirmLabel: 'Reset password',
        }))) return
        const r = await adminResetPassword(userId)
        setOut(r.temp ?? r.error ?? 'failed')
      }}
      className="rounded-md border border-line bg-paper-2 px-3 py-1.5 text-xs hover:border-accent">
      Reset password…
    </button>
  )
}
