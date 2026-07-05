import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getPrimarySite } from '@/lib/workspace'
import { createClient } from '@/lib/supabase/server'
import { Sidebar, type SidebarSite } from '@/components/app/sidebar'
import { AppHeader } from '@/components/app/app-header'
import { CommandMenu } from '@/components/app/command-menu'
import { OverlayProvider } from '@/components/ui/overlays'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const site = await getPrimarySite()
  if (!site) redirect('/onboarding')

  // Attention badge: households without an invite link yet (overhaul spec).
  const supabase = await createClient()
  const [{ data: hh }, { data: tokens }] = await Promise.all([
    supabase.from('households').select('id').eq('site_id', site.siteId).is('archived_at', null),
    supabase.from('guest_access_tokens').select('household_id').eq('site_id', site.siteId).eq('revoked', false),
  ])
  const withLink = new Set((tokens ?? []).map((t) => t.household_id))
  const unsent = (hh ?? []).filter((h) => !withLink.has(h.id)).length

  const sidebarSite: SidebarSite = {
    title: site.title,
    slug: site.slug,
    status: site.status,
    email: user.email ?? '',
    counts: { invitations: unsent ?? 0 },
  }

  return (
    <OverlayProvider>
      <div className="flex min-h-screen bg-paper text-ink">
        <Sidebar site={sidebarSite} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader site={sidebarSite} />
          <main className="flex-1">{children}</main>
        </div>
      </div>
      <CommandMenu siteSlug={site.slug} />
    </OverlayProvider>
  )
}
