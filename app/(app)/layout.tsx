import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getPrimarySite } from '@/lib/workspace'
import { createClient } from '@/lib/supabase/server'
import { Sidebar, type SidebarSite } from '@/components/app/sidebar'
import { AppHeader } from '@/components/app/app-header'
import { ChromeGate } from '@/components/app/chrome-gate'
import { CommandMenu } from '@/components/app/command-menu'
import { OverlayProvider } from '@/components/ui/overlays'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const site = await getPrimarySite()
  if (!site) redirect('/onboarding')

  // Attention badges + notification bell inputs: unsent invite links,
  // payments due/overdue, overdue tasks, fresh RSVP answers (48h).
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const soon = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  const since = new Date(Date.now() - 48 * 3600000).toISOString()
  const [{ data: hh }, { data: tokens }, { data: duePayments }, { count: overdueTasks }, { count: freshRsvps }] = await Promise.all([
    supabase.from('households').select('id').eq('site_id', site.siteId).is('archived_at', null),
    supabase.from('guest_access_tokens').select('household_id').eq('site_id', site.siteId).eq('revoked', false),
    supabase.from('vendor_payments').select('id, due_date').eq('site_id', site.siteId)
      .is('archived_at', null).eq('status', 'scheduled').lte('due_date', soon),
    supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('site_id', site.siteId).is('archived_at', null).neq('status', 'done').lt('due_date', today),
    supabase.from('responses').select('id', { count: 'exact', head: true })
      .eq('site_id', site.siteId).gte('responded_at', since),
  ])
  const withLink = new Set((tokens ?? []).map((t) => t.household_id))
  const unsent = (hh ?? []).filter((h) => !withLink.has(h.id)).length
  const paymentsDue = (duePayments ?? []).length
  const paymentsOverdue = (duePayments ?? []).filter((p) => p.due_date < today).length

  const s = (n: number) => (n === 1 ? '' : 's')
  const notifications: { href: string; text: string; tone: 'ok' | 'warn' | 'bad' }[] = []
  if (freshRsvps) notifications.push({ href: '/rsvps', text: `${freshRsvps} new RSVP answer${s(freshRsvps)} in the last two days`, tone: 'ok' })
  if (paymentsOverdue) notifications.push({ href: '/payments', text: `${paymentsOverdue} vendor payment${s(paymentsOverdue)} overdue`, tone: 'bad' })
  else if (paymentsDue) notifications.push({ href: '/payments', text: `${paymentsDue} vendor payment${s(paymentsDue)} due within 14 days`, tone: 'warn' })
  if (unsent) notifications.push({ href: '/invitations', text: `${unsent} household${s(unsent)} still need${unsent === 1 ? 's' : ''} an invite link`, tone: 'warn' })
  if (overdueTasks) notifications.push({ href: '/tasks', text: `${overdueTasks} task${s(overdueTasks)} overdue`, tone: 'bad' })

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
        {/* 1c: /website is chrome-free — the artifact is the interface */}
        <ChromeGate><Sidebar site={sidebarSite} /></ChromeGate>
        <div className="flex min-w-0 flex-1 flex-col">
          <ChromeGate><AppHeader site={sidebarSite} notifications={notifications} /></ChromeGate>
          <main className="flex-1">{children}</main>
        </div>
      </div>
      <CommandMenu siteSlug={site.slug} />
    </OverlayProvider>
  )
}
