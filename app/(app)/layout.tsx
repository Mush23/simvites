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

  // Attention badges: households without an invite link yet, and payments
  // that are overdue or due within 14 days (overhaul spec).
  const supabase = await createClient()
  const soon = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  const [{ data: hh }, { data: tokens }, { data: duePayments }] = await Promise.all([
    supabase.from('households').select('id').eq('site_id', site.siteId).is('archived_at', null),
    supabase.from('guest_access_tokens').select('household_id').eq('site_id', site.siteId).eq('revoked', false),
    supabase.from('vendor_payments').select('id').eq('site_id', site.siteId)
      .is('archived_at', null).eq('status', 'scheduled').lte('due_date', soon),
  ])
  const withLink = new Set((tokens ?? []).map((t) => t.household_id))
  const unsent = (hh ?? []).filter((h) => !withLink.has(h.id)).length
  const paymentsDue = (duePayments ?? []).length

  const sidebarSite: SidebarSite = {
    title: site.title,
    slug: site.slug,
    status: site.status,
    email: user.email ?? '',
    counts: { invitations: unsent ?? 0, payments: paymentsDue },
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
