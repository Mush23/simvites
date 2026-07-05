import type { LucideIcon } from 'lucide-react'
import {
  House, Globe, CalendarDays, Users, Mail, MailCheck, Armchair,
  Wallet, Store, ListChecks, Folder, ChartColumn, Settings,
} from 'lucide-react'

// One nav model for the sidebar, mobile nav and ⌘K palette (overhaul spec:
// grouped modules, 16px icons at 1.7px stroke, mono group labels).

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Key into the counts record the layout computes (badge). */
  countKey?: 'invitations'
}
export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  { label: 'Overview', items: [{ href: '/dashboard', label: 'Home', icon: House }] },
  {
    label: 'Website',
    items: [
      { href: '/website', label: 'Site editor', icon: Globe },
      { href: '/events', label: 'Events', icon: CalendarDays },
    ],
  },
  {
    label: 'Guests',
    items: [
      { href: '/guests', label: 'Guest list', icon: Users },
      { href: '/invitations', label: 'Invitations', icon: Mail, countKey: 'invitations' },
      { href: '/rsvps', label: 'RSVPs', icon: MailCheck },
      { href: '/seating', label: 'Seating', icon: Armchair },
    ],
  },
  {
    label: 'Planning',
    items: [
      { href: '/budget', label: 'Budget', icon: Wallet },
      { href: '/vendors', label: 'Vendors', icon: Store },
      { href: '/tasks', label: 'Tasks', icon: ListChecks },
      { href: '/files', label: 'Files', icon: Folder },
    ],
  },
  { label: 'Insights', items: [{ href: '/reports', label: 'Reports', icon: ChartColumn }] },
]

export const SETTINGS_ITEM: NavItem = { href: '/settings', label: 'Settings', icon: Settings }

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM]

/** Page title for the header, longest-prefix match. */
export function pageTitleFor(pathname: string): string {
  const hit = [...ALL_NAV_ITEMS]
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]
  return hit?.label ?? 'Home'
}
