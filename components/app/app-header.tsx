'use client'

// App header (overhaul): page title · ⌘K search pill · saved indicator ·
// Preview (outline) · Publish (coral → publishing → green Live ✓).

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, ExternalLink, Bell } from 'lucide-react'
import { pageTitleFor } from './nav-model'
import { MobileNav, type SidebarSite } from './sidebar'
import { publishSiteNow } from '@/app/(app)/actions'
import { useOverlays } from '@/components/ui/overlays'

type PublishState = 'idle' | 'publishing' | 'live' | 'locked'

export interface HeaderNotification { href: string; text: string; tone: 'ok' | 'warn' | 'bad' }

function NotificationBell({ items }: { items: HeaderNotification[] }) {
  const [open, setOpen] = useState(false)
  const tone = (t: HeaderNotification['tone']) =>
    t === 'ok' ? 'var(--ok)' : t === 'bad' ? 'var(--bad)' : 'var(--warn)'
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-2 hover:border-line-2 hover:text-ink">
        <Bell size={15} strokeWidth={1.7} />
        {/* A count needing attention, not an action — same treatment the
            sidebar nav badges already use, so it stops being a second solid
            coral sitting next to Publish in the same header. */}
        {items.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-warn/30 bg-warn-soft px-1 text-[9px] font-semibold text-warn nums">
            {items.length}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[var(--z-sticky)]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-[var(--z-panel)] w-80 rounded-xl border border-line bg-surface p-1.5 shadow-lift">
            <p className="microlabel px-2.5 pb-1 pt-1.5">Needs your attention</p>
            {items.length === 0 && (
              <p className="px-2.5 py-3 text-[13px] text-ink-3">All caught up — nothing needs you right now.</p>
            )}
            {items.map((n, i) => (
              <Link key={i} href={n.href} onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink hover:bg-surface-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone(n.tone) }} />
                <span className="min-w-0 flex-1">{n.text}</span>
                <span aria-hidden className="text-ink-3">→</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function AppHeader({ site, notifications = [] }: { site: SidebarSite; notifications?: HeaderNotification[] }) {
  const pathname = usePathname()
  const { toast } = useOverlays()
  const [pub, setPub] = useState<PublishState>('idle')

  async function publish() {
    setPub('publishing')
    const res = await publishSiteNow()
    if (res.locked) { setPub('locked'); return }
    if (res.error) { setPub('idle'); toast(res.error, { tone: 'warn' }); return }
    setPub('live')
    toast('Your site is live')
    setTimeout(() => setPub('idle'), 3000)
  }

  return (
    <header className="app-header sticky top-0 z-[var(--z-sticky)] flex items-center gap-3 border-b border-line px-5 py-2.5">
      <MobileNav site={site} />
      <h1 className="text-[14.5px] font-semibold tracking-tight text-ink">{pageTitleFor(pathname)}</h1>

      <button type="button"
        onClick={() => window.dispatchEvent(new Event('open-command-menu'))}
        className="ml-2 hidden min-w-[200px] items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-left text-[12.5px] text-ink-3 hover:border-line-2 sm:flex">
        <Search size={13} strokeWidth={1.7} />
        <span className="flex-1">Search…</span>
        <kbd className="rounded border border-line bg-surface px-1 font-mono text-[9.5px] text-ink-3">⌘K</kbd>
      </button>
      {/* Mobile: the palette needs a touch trigger — the pill above is hidden <sm */}
      <button type="button" aria-label="Search"
        onClick={() => window.dispatchEvent(new Event('open-command-menu'))}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-2 hover:border-line-2 hover:text-ink sm:hidden">
        <Search size={15} strokeWidth={1.7} />
      </button>

      <div className="ml-auto flex items-center gap-2.5">
        <span className="hidden items-center gap-1.5 font-mono text-[10px] text-ink-3 lg:flex">
          <span className={`h-1.5 w-1.5 rounded-full ${site.status === 'published' ? 'bg-ok' : 'bg-warn'}`} />
          {site.status === 'published' ? 'Live' : 'Draft'}
        </span>
        <NotificationBell items={notifications} />
        <Link href={`/s/${site.slug}`} target="_blank"
          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-ink hover:border-line-2">
          Preview <ExternalLink size={12} strokeWidth={1.7} className="text-ink-3" />
        </Link>
        {pub === 'locked' ? (
          <Link href="/settings" className="rounded-lg border border-accent-line bg-accent-soft px-3 py-1.5 text-[13px] font-medium text-accent-ink">
            Unlock to publish →
          </Link>
        ) : (
          // Outline, not a fill. This header is on EVERY screen, so a solid
          // Publish here meant every screen showed two solid corals — its own
          // primary plus this one. Publishing is not the Guest list's job or
          // the Budget's; it stays one click away as a strong secondary, and
          // the screen's own action owns the solid. On /website, where
          // publishing IS the task, the dock's Publish is solid and this header
          // is not rendered at all (ChromeGate). `Live ✓` keeps its green fill:
          // that is success feedback, not brand.
          <button type="button" onClick={publish} disabled={pub === 'publishing'}
            className={`rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
              pub === 'live'
                ? 'bg-ok text-white'
                : 'border border-accent-line text-accent-ink hover:bg-accent-soft'}`}>
            {pub === 'publishing' ? 'Publishing…' : pub === 'live' ? 'Live ✓' : 'Publish'}
          </button>
        )}
      </div>
    </header>
  )
}
