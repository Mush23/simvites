'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptInvitation } from './actions'

/**
 * The one place the invitation actually turns into access. Deliberately an
 * explicit button rather than something that fires on page load: the whole
 * point of M1's fix is that arriving at a link is not consent.
 */
export function AcceptButton({ token }: { token: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function accept() {
    setError(null)
    startTransition(async () => {
      const res = await acceptInvitation(token)
      if (res.error) {
        setError(res.error)
        return
      }
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={accept}
          disabled={pending}
          className="rounded-md bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Accepting…' : 'Accept invitation'}
        </button>
        <a
          href="/dashboard"
          className="rounded-md border border-line px-4 py-2.5 text-[13px] font-medium text-ink transition-colors hover:border-line-2"
        >
          Not now
        </a>
      </div>
      {error && <p className="mt-3 text-[13px] text-bad">{error}</p>}
    </div>
  )
}
