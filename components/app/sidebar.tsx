'use client'

import Link from 'next/link'
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
