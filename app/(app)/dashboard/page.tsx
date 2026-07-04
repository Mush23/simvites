import Link from 'next/link'
import { getPrimarySite } from '@/lib/workspace'
import { computeReadiness } from '@/lib/readiness'
import { PageHeader, StatCard } from '@/components/app/ui'
import { BRAND_NAME } from '@/lib/brand'

export const metadata = { title: `Command Centre · ${BRAND_NAME}` }

export default async function DashboardPage() {
  const site = await getPrimarySite()
  const r = await computeReadiness(site!.siteId)

  const headline =
    r.score >= 85 ? "You're in great shape."
    : r.score >= 60 ? "You're on track."
    : r.score >= 30 ? 'Good start — keep the momentum.'
    : "Let's get you set up."

  return (
    <div className="mx-auto max-w-[1060px] px-6 py-10">
      <PageHeader
        eyebrow="Command Centre"
        title={headline}
        description={
          r.attention.length
            ? `${r.attention.length} thing${r.attention.length === 1 ? '' : 's'} need${r.attention.length === 1 ? 's' : ''} a quick look.`
            : 'Everything on the checklist is handled. Enjoy the calm.'
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_2fr]">
        {/* Readiness ring card */}
        <section className="rounded-card border border-line bg-surface p-7 shadow-card">
          <p className="eyebrow mb-4">Readiness</p>
          <p className="font-display text-7xl nums text-ink">{r.score}%</p>
          <p className="mt-2 text-sm text-ink-2">ready for the big weekend</p>
          <div className="mt-5 h-2 w-full overflow-hidden rounded-pill bg-paper-2">
            <div className="h-full rounded-pill bg-accent transition-all" style={{ width: `${r.score}%` }} />
          </div>

          {r.attention.length > 0 && (
            <div className="mt-6 space-y-2.5">
              {r.attention.slice(0, 5).map((c) => (
                <Link key={c.key} href={c.href}
                  className="flex items-center justify-between rounded-md border border-line bg-paper-2 px-3.5 py-2.5 text-sm text-ink transition-colors hover:border-accent">
                  <span>{c.label}</span>
                  <span aria-hidden className="text-accent-ink">→</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Supporting stats */}
        <div className="grid content-start gap-5 sm:grid-cols-2">
          <StatCard label="Events" value={r.stats.events} hint="celebrations planned" />
          <StatCard label="Guests" value={r.stats.guests}
            hint={`${r.stats.invitedGuests} invited to at least one event`} />
          <StatCard label="Households responded" value={`${r.stats.respondedHouseholds}/${r.stats.households}`}
            bar={r.stats.households ? (r.stats.respondedHouseholds / r.stats.households) * 100 : 0} />
          <StatCard label="Attending" value={r.stats.attending} hint="guest-event confirmations" />
          <StatCard label="Vendors booked" value={r.stats.vendorsBooked} />
          <StatCard label="Open tasks" value={r.stats.openTasks}
            hint={r.stats.overdueTasks ? `${r.stats.overdueTasks} overdue` : 'none overdue'} />
        </div>
      </div>
    </div>
  )
}
