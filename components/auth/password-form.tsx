'use client'

// Set-a-new-password form — shared by the /auth/reset recovery page and the
// Account security card in Settings. Uses the current session.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function PasswordForm({ redirectTo, cta = 'Set new password' }: {
  redirectTo?: string
  cta?: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (pw.length < 8) { setError('Use at least 8 characters.'); return }
    if (pw !== pw2) { setError('The passwords don’t match.'); return }
    setPending(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPending(false)
    if (error) { setError(error.message); return }
    setDone(true)
    setPw(''); setPw2('')
    if (redirectTo) { router.push(redirectTo); router.refresh() }
  }

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-medium text-ink-2">New password</span>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-medium text-ink-2">Repeat it</span>
        <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent" />
      </label>
      {error && <p className="text-[13px] text-bad">{error}</p>}
      {done && !redirectTo && <p className="text-[13px] text-ok">Password updated.</p>}
      <button type="submit" disabled={pending}
        className="rounded-md w-full bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50">
        {pending ? 'Saving…' : cta}
      </button>
    </form>
  )
}
