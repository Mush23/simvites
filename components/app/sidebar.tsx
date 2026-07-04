'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { BRAND_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

const MODULES: { href: string; label: string }[] = [
  { href: '/dashboard', label: 'Command Centre' },
  { href: '/website', label: 'Website' },
  { href: '/events', label: 'Events' },
  { href: '/guests', label: 'Guests' },
  { href: '/invitations', label: 'Invitations' },
  { href: '/rsvps', label: 'RSVPs' },
  { href: '/budget', label: 'Budget' },
  { href: '/vendors', label: 'Vendors' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/files', label: 'Files' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings', label: 'Settings' },
]

/** Mobile slide-over nav — the same 12 modules, reachable by thumb. */
export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-line text-ink">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)}>
          <nav aria-label="Modules" onClick={(e) => e.stopPropagation()}
            className="h-full w-72 overflow-y-auto border-r border-line bg-paper-2 px-4 py-6">
            <div className="mb-5 flex items-center justify-between px-2">
              <span className="font-display text-2xl text-ink">{BRAND_NAME}</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu"
                className="flex min-h-11 min-w-11 items-center justify-center text-ink-3">✕</button>
            </div>
            {MODULES.map((m) => {
              const active = pathname === m.href || pathname.startsWith(`${m.href}/`)
              return (
                <Link key={m.href} href={m.href} onClick={() => setOpen(false)}
                  className={cn('mb-1 block rounded-md px-3 py-3 text-[15px]',
                    active ? 'bg-surface text-ink shadow-card' : 'text-ink-2')}>
                  {m.label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-paper-2 md:flex">
      <div className="px-6 py-6">
        <Link href="/dashboard" className="font-display text-2xl text-ink">
          {BRAND_NAME}
        </Link>
      </div>
      <nav className="flex-1 px-3">
        {MODULES.map((m) => {
          const active = pathname === m.href || pathname.startsWith(`${m.href}/`)
          return (
            <Link
              key={m.href}
              href={m.href}
              className={cn(
                'mb-0.5 block rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-surface text-ink shadow-card'
                  : 'text-ink-2 hover:bg-surface/60 hover:text-ink',
              )}
            >
              {m.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
