'use client'

import { BRAND_NAME } from '@/lib/brand'

// Global error boundary — warm, human, recoverable. Never a stack trace.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6 text-center text-ink">
      <div className="max-w-md">
        <p className="eyebrow mb-3">{BRAND_NAME}</p>
        <h1 className="font-display text-4xl">Something went wrong.</h1>
        <p className="mt-4 leading-relaxed text-ink-2">
          Nothing is lost — your data is safe. Try again, and if it keeps happening, tell us.
        </p>
        <button type="button" onClick={reset}
          className="mt-8 rounded-md bg-accent px-7 py-3 font-semibold text-white transition-transform hover:-translate-y-px">
          Try again
        </button>
      </div>
    </div>
  )
}
