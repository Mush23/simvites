'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X, LogOut } from 'lucide-react'
import { BRAND_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'
import { NAV_GROUPS, SETTINGS_ITEM, isNavItemActive, type NavItem } from './nav-model'
import { ThemeToggle } from '@/components/theme/theme-toggle'

// ═══════════════════════════════════════════════════════════════════════
// App sidebar (overhaul): 230px, surface bg, grouped nav with mono group
// labels, 16px lucide icons, active = surface-2 + inset coral bar.
// ═══════════════════════════════════════════════════════════════════════

export interface SidebarSite {
  title: string
  slug: string
  status: string
  email: string
  counts?: Partial<Record<'invitations' | 'payments', number>>
}

function NavLink({ item, active, count, onClick }: {
  item: NavItem; active: boolean; count?: number; onClick?: () => void
}) {
  const Icon = item.icon
  return (
    <Link href={item.href} onClick={onClick}
      className={cn(
        'mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] transition-colors',
        // Active nav is a STATE, not an action: warm fill, ink text, ink rail.
        // The coral rail made the sidebar compete with the one real CTA on
        // every screen.
        active
          ? 'bg-surface-2 font-semibold text-ink shadow-[inset_2px_0_0_var(--nav-rail)]'
          : 'font-medium text-ink-2 hover:bg-surface-2 hover:text-ink',
      )}>
      <Icon size={16} strokeWidth={1.7} className={active ? 'text-ink' : 'text-ink-3'} />
      <span className="flex-1">{item.label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="rounded-full bg-warn-soft px-1.5 py-px font-mono text-[9.5px] font-semibold text-warn">
          {count}
        </span>
      )}
    </Link>
  )
}

function NavBody({ site, onNavigate }: { site: SidebarSite; onNavigate?: () => void }) {
  const pathname = usePathname()
  // A merged surface stays lit on any of its tabs, so /messages keeps
  // "Invites & messaging" highlighted rather than orphaning the user.
  const isActive = (item: NavItem) => isNavItemActive(item, pathname)

  return (
    <>
      <div className="px-4 pb-2 pt-5">
        <Link href="/dashboard" onClick={onNavigate} className="px-1 text-[13px] font-semibold tracking-tight text-ink">
          {BRAND_NAME}
        </Link>
        {/* Site switcher: the ARTIFACT speaks serif — the couple's name. */}
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-paper px-2.5 py-2">
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', site.status === 'published' ? 'bg-ok' : 'bg-warn')} />
          <span className="min-w-0 flex-1 truncate font-display text-[15px] leading-none text-ink">{site.title}</span>
          <span className="font-sans text-[9px] uppercase tracking-wider text-ink-3">
            {site.status === 'published' ? 'live' : 'draft'}
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-3">
        {NAV_GROUPS.map((g) => (
          <div key={g.label} className="mt-4 first:mt-2">
            <p className="microlabel mb-1.5 px-2.5">{g.label}</p>
            {g.items.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item)}
                count={item.countKey ? site.counts?.[item.countKey] : undefined} onClick={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-line px-2.5 py-3">
        <NavLink item={SETTINGS_ITEM} active={isActive(SETTINGS_ITEM)} onClick={onNavigate} />
        <div className="mt-1 flex items-center justify-between px-2.5 py-1">
          <span className="text-[12px] text-ink-3">Appearance</span>
          <ThemeToggle />
        </div>
        <div className="mt-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold uppercase text-ink-2">
            {site.email.slice(0, 1)}
          </span>
          {/* title so a truncated address is still recoverable on hover */}
          <span title={site.email} className="min-w-0 flex-1 truncate text-[11.5px] text-ink-3">{site.email}</span>
          <form action="/auth/signout" method="post">
            <button type="submit" title="Sign out" aria-label="Sign out"
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink">
              <LogOut size={14} strokeWidth={1.7} />
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

export function Sidebar({ site }: { site: SidebarSite }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[230px] shrink-0 flex-col border-r border-line bg-surface md:flex">
      <NavBody site={site} />
    </aside>
  )
}

/** Mobile slide-over nav — same model, reachable by thumb. */
export function MobileNav({ site }: { site: SidebarSite }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="md:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}
        className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-line text-ink">
        <Menu size={17} strokeWidth={1.7} />
      </button>
      {open && (
        <div className="fixed inset-0 z-[var(--z-overlay)] bg-black/45 backdrop-blur-[2px]" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className="relative flex h-full w-[270px] flex-col overflow-y-auto border-r border-line bg-surface">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu"
              className="absolute right-3 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-ink-3">
              <X size={16} strokeWidth={1.7} />
            </button>
            <NavBody site={site} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
