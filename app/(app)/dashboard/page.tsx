import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader, StatCard } from '@/components/app/ui'
import { BRAND_NAME } from '@/lib/brand'

export const metadata = { title: `Command Centre · ${BRAND_NAME}` }

export default async function DashboardPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()

  // Real counts (RLS-scoped to this user's site).
  const [{ count: events }, { count: guests }, { count: attending }] = await Promise.all([
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('site_id', site!.siteId).is('archived_at', null),
    supabase.from('guests').select('id', { count: 'exact', head: true }).eq('site_id', site!.siteId).is('archived_at', null),
    supabase.from('responses').select('id', { count: 'exact', head: true }).eq('site_id', site!.siteId).eq('status', 'attending'),
  ])

  // A trivial readiness placeholder for 1A (the weighted score lands in 1D).
  const hasEvents = (events ?? 0) > 0
  const hasGuests = (guests ?? 0) > 0
  const readiness = Math.round(((hasEvents ? 1 : 0) + (hasGuests ? 1 : 0)) * 50)

  return (
    <div className="mx-auto max-w-[1060px] px-6 py-10">
      <PageHeader
        eyebrow="Command Centre"
        title="You're getting set up."
        description={`Welcome to ${BRAND_NAME}. This is where everything comes together — once your events and guests are in, this becomes your single source of truth.`}
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Readiness" value={`${readiness}%`} hint="for the big weekend" bar={readiness} />
        <StatCard label="Events" value={events ?? 0} hint="on this site" />
        <StatCard label="Guests" value={guests ?? 0} hint="across households" />
        <StatCard label="Attending" value={attending ?? 0} hint="RSVPs in" />
      </div>

      <div className="mt-8 rounded-card border border-line bg-surface p-7 shadow-card">
        <p className="eyebrow mb-2">Next</p>
        <p className="text-ink-2">
          Foundation is ready: your site exists, tenancy is isolated, and the workspace is live.
          Building the website &amp; events module is next (Phase 1B).
        </p>
      </div>
    </div>
  )
}
