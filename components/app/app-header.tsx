'use client'

// App header (overhaul): page title · ⌘K search pill · saved indicator ·
// Preview (outline) · Publish (coral → publishing → green Live ✓).

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, ExternalLink } from 'lucide-react'
import { pageTitleFor } from './nav-model'
import { MobileNav, type SidebarSite } from './sidebar'
import { publishSiteNow } from '@/app/(app)/actions'
import { useOverlays } from '@/components/ui/overlays'

type PublishState = 'idle' | 'publishing' | 'live' | 'locked'

export function AppHeader({ site }: { site: SidebarSite }) {
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
    <header className="app-header sticky top-0 z-40 flex items-center gap-3 border-b border-line px-5 py-2.5">
      <MobileNav site={site} />
      <h1 className="text-[14.5px] font-semibold tracking-tight text-ink">{pageTitleFor(pathname)}</h1>

      <button type="button"
        onClick={() => window.dispatchEvent(new Event('open-command-menu'))}
        className="ml-2 hidden min-w-[200px] items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-left text-[12.5px] text-ink-3 hover:border-line-2 sm:flex">
        <Search size={13} strokeWidth={1.7} />
        <span className="flex-1">Search…</span>
        <kbd className="rounded border border-line bg-surface px-1 font-mono text-[9.5px] text-ink-3">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2.5">
        <span className="hidden items-center gap-1.5 font-mono text-[10px] text-ink-3 lg:flex">
          <span className={`h-1.5 w-1.5 rounded-full ${site.status === 'published' ? 'bg-ok' : 'bg-warn'}`} />
          {site.status === 'published' ? 'Live' : 'Draft'}
        </span>
        <Link href={`/s/${site.slug}`} target="_blank"
          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-ink hover:border-line-2">
          Preview <ExternalLink size={12} strokeWidth={1.7} className="text-ink-3" />
        </Link>
        {pub === 'locked' ? (
          <Link href="/settings" className="rounded-lg border border-accent-line bg-accent-soft px-3 py-1.5 text-[13px] font-medium text-accent-ink">
            Unlock to publish →
          </Link>
        ) : (
          <button type="button" onClick={publish} disabled={pub === 'publishing'}
            className={`px-3.5 py-1.5 text-[13px] font-semibold text-white disabled:opacity-60 ${
              pub === 'live' ? 'bg-ok' : 'bg-accent'}`}>
            {pub === 'publishing' ? 'Publishing…' : pub === 'live' ? 'Live ✓' : 'Publish'}
          </button>
        )}
      </div>
    </header>
  )
}
