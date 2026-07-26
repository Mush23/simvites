'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { notify } from '@/components/ui/overlays'
import { applyTemplate } from './actions'

// A client button rather than a bare <form action={applyTemplate}>: the action
// returns a result, and the codebase's inline-wrapper pattern would throw it
// away. Choosing a look is a deliberate act — if it fails, say so.

export function UseTemplateButton({ templateKey, templateName }: {
  templateKey: string
  templateName: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  async function apply() {
    setBusy(true)
    const fd = new FormData()
    fd.set('template', templateKey)
    const res = await applyTemplate(fd)
    setBusy(false)
    if (res?.error) { notify(res.error, { tone: 'warn' }); return }
    notify(`${templateName} applied — publish when you're ready to make it live`)
    startTransition(() => router.refresh())
  }

  return (
    <button type="button" onClick={apply} disabled={busy}
      className="w-full rounded-md bg-accent px-3 py-2 text-[12.5px] font-semibold text-white transition-opacity disabled:opacity-60">
      {busy ? 'Applying…' : 'Use this template'}
    </button>
  )
}
