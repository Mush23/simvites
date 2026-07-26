'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'

// Assistant left the sidebar in Phase 2. It is cross-cutting — you want it
// while looking at a guest list or a budget line, not as a seventeenth
// destination competing with them. So: a corner affordance on every screen,
// plus ⌘K.
//
// Hidden on /assistant itself (you are already there) and on /website, where
// the artifact is the interface and floating chrome would sit over the canvas.

export function AssistantLauncher() {
  const pathname = usePathname()
  if (pathname.startsWith('/assistant') || pathname.startsWith('/website')) return null

  return (
    <Link href="/assistant"
      title="Ask the assistant"
      aria-label="Ask the assistant"
      className="fixed bottom-5 right-5 z-[var(--z-toolbar)] flex h-11 items-center gap-2 rounded-pill border border-line bg-surface px-4 text-[13px] font-medium text-ink shadow-lift transition-colors hover:border-line-2">
      <Sparkles size={15} strokeWidth={1.7} className="text-ink-3" aria-hidden />
      <span className="hidden sm:inline">Ask</span>
    </Link>
  )
}
