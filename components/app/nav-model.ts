import type { LucideIcon } from 'lucide-react'
import {
  House, Globe, CalendarDays, Users, Mail, MailCheck, Armchair,
  Wallet, Store, ListChecks, Folder, ChartColumn, Settings, CalendarClock, MailOpen,
  Sparkles, MessagesSquare, LayoutTemplate,
} from 'lucide-react'

// One nav model for the sidebar, mobile nav and ⌘K palette.
//
// Phase 2: seventeen items that needed a scrolling sidebar became eleven that
// fit. Nothing was deleted — the merged surfaces keep their own routes and are
// reached through a tab bar (see SurfaceTabs), so every deep link, export URL
// and notification href still resolves. What changed is how many things
// compete for attention in the left rail.
//
// The old grouping also contradicted itself: Save the Date sat under WEBSITE
// while Invitations sat under GUESTS, when they are the same job.

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Key into the counts record the layout computes (badge). */
  countKey?: 'invitations' | 'payments'
  /**
   * Sibling routes that belong to this surface and should light it up in the
   * sidebar. These are the tabs of a merged surface.
   */
  match?: string[]
}
export interface NavGroup {
  label: string
  items: NavItem[]
}

/** Tabs of the merged "Invites & messaging" surface. */
export const INVITE_ROUTES = ['/save-the-date', '/invitations', '/messages']
/** Tabs of the merged "Budget & payments" surface. */
export const MONEY_ROUTES = ['/budget', '/payments']
/** Vendors absorbed Files — contracts and quotes belong to a vendor. */
export const VENDOR_ROUTES = ['/vendors', '/files']

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'The wedding',
    items: [
      { href: '/dashboard', label: 'Home', icon: House },
      // The spine: events already drive the schedule, invite matrix, RSVP
      // cards, budget lines and seating.
      { href: '/events', label: 'Events', icon: CalendarDays },
    ],
  },
  {
    label: 'The site',
    items: [
      { href: '/website', label: 'Site editor', icon: Globe },
      // Promoted out of Settings: choosing the look is the most emotionally
      // significant decision in the product, not a site default.
      { href: '/templates', label: 'Templates', icon: LayoutTemplate },
    ],
  },
  {
    label: 'Guests',
    items: [
      { href: '/guests', label: 'Guest list', icon: Users },
      {
        href: '/invitations', label: 'Invites & messaging', icon: Mail,
        countKey: 'invitations', match: INVITE_ROUTES,
      },
      { href: '/rsvps', label: 'RSVPs', icon: MailCheck },
      { href: '/seating', label: 'Seating', icon: Armchair },
    ],
  },
  {
    label: 'Planning',
    items: [
      {
        href: '/budget', label: 'Budget & payments', icon: Wallet,
        countKey: 'payments', match: MONEY_ROUTES,
      },
      { href: '/vendors', label: 'Vendors', icon: Store, match: VENDOR_ROUTES },
      { href: '/tasks', label: 'Tasks', icon: ListChecks },
    ],
  },
]

export const SETTINGS_ITEM: NavItem = { href: '/settings', label: 'Settings', icon: Settings }

/** Everything in the left rail, in order. Eleven plus Settings. */
export const ALL_NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM]

/**
 * Surfaces that left the sidebar but must stay findable. The ⌘K palette reads
 * this, NOT the sidebar list — slimming the rail should reduce visual noise,
 * never reachability.
 *
 * Assistant and Reports are here rather than in the rail because neither is a
 * place: the assistant is cross-cutting and belongs everywhere, and a report
 * is an output you ask for.
 */
export const OFF_RAIL_ITEMS: NavItem[] = [
  { href: '/save-the-date', label: 'Save the Date', icon: MailOpen },
  { href: '/messages', label: 'Messages', icon: MessagesSquare },
  { href: '/payments', label: 'Payments', icon: CalendarClock },
  { href: '/files', label: 'Files', icon: Folder },
  { href: '/assistant', label: 'Assistant', icon: Sparkles },
  { href: '/reports', label: 'Reports', icon: ChartColumn },
]

/** Everything reachable by name, for the command palette. */
export const COMMAND_ITEMS: NavItem[] = [...ALL_NAV_ITEMS, ...OFF_RAIL_ITEMS]

/** Does this pathname belong to this nav item's surface? */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  const hrefs = item.match ?? [item.href]
  return hrefs.some((h) => pathname === h || pathname.startsWith(`${h}/`))
}

/**
 * Page title for the header, longest-prefix match over EVERY route — the
 * merged surfaces still need their own titles, so this resolves against
 * COMMAND_ITEMS rather than the rail.
 */
export function pageTitleFor(pathname: string): string {
  const hit = [...COMMAND_ITEMS]
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]
  return hit?.label ?? 'Home'
}
