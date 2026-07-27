'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Tabs for a MERGED surface — the sibling routes that Phase 2 folded into one
// nav item. Deliberately a segmented pill group, not the underline tabs used
// elsewhere: underline tabs switch the view *within* a page (Vendors' pipeline
// vs directory), while these move between sibling pages. Two different jobs
// should not wear the same clothes, especially where both appear at once.
//
// Link-based rather than stateful, so every tab keeps its own URL. That is what
// lets the merge happen without breaking a single deep link, export href or
// notification target.

export interface SurfaceTab {
  href: string
  label: string
  /** Optional count, e.g. households still needing an invite link. */
  badge?: number
}

// Tab sets live here so the pages sharing a surface cannot drift out of sync —
// three separate hand-written copies of the invites bar would be three chances
// to forget one when a tab is added.

/** Save the Date · Invitations · Messages — all the same job: reaching guests. */
export const INVITE_TABS: SurfaceTab[] = [
  { href: '/save-the-date', label: 'Save the date' },
  { href: '/invitations', label: 'Invitations' },
  { href: '/messages', label: 'Messages' },
]

/** Budget · Payments. The plan listed a third "Schedule" tab, but /payments
 *  already IS the payment schedule — there was no separate surface to split. */
export const MONEY_TABS: SurfaceTab[] = [
  { href: '/budget', label: 'Budget' },
  { href: '/payments', label: 'Payments' },
]

/** Vendors · Files — contracts and quotes belong to a vendor, not to nothing. */
export const VENDOR_TABS: SurfaceTab[] = [
  { href: '/vendors', label: 'Vendors' },
  { href: '/files', label: 'Files' },
]

/** Copy a tab set with a badge applied to one href. */
export function withBadge(tabs: SurfaceTab[], href: string, badge: number): SurfaceTab[] {
  return tabs.map((t) => (t.href === href ? { ...t, badge } : t))
}

export function SurfaceTabs({ tabs }: { tabs: SurfaceTab[] }) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav aria-label="Sections" className="mb-6 flex flex-wrap items-center gap-1 rounded-pill border border-line bg-surface p-1 shadow-card w-fit">
      {tabs.map((t) => {
        const active = isActive(t.href)
        return (
          <Link key={t.href} href={t.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-pill px-3.5 py-1.5 text-[13px] transition-colors ${
              active
                // Selected surface is a STATE — ink, never the brand accent.
                ? 'bg-surface-2 font-semibold text-ink'
                : 'font-medium text-ink-2 hover:bg-surface-2 hover:text-ink'
            }`}>
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className={`rounded-full px-1.5 py-px text-[9.5px] font-semibold nums ${
                active ? 'bg-warn-soft text-warn-text' : 'bg-surface-2 text-ink-3'}`}>
                {t.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
