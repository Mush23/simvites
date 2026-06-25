'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CodeForm({ initial = '' }: { initial?: string }) {
  const router = useRouter()
  const [code, setCode] = useState(initial)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (code.trim()) router.push(`?code=${encodeURIComponent(code.trim())}`)
      }}
      className="mx-auto flex max-w-md flex-col items-center gap-5"
    >
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="e.g. patel-family"
        className="w-full rounded-lg border border-border bg-card px-5 py-3 text-center text-foreground outline-none focus:border-gold"
        autoFocus
      />
      <button
        type="submit"
        className="rounded-full bg-primary px-8 py-3 text-[0.7rem] uppercase tracking-wide-soft text-primary-foreground hover:opacity-90"
      >
        View my invitation
      </button>
    </form>
  )
}
