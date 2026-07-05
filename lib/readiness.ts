import 'server-only'
import { createClient } from '@/lib/supabase/server'

// Dashboard readiness = a weighted checklist computed server-side (handoff §6).
// Weights live HERE so tuning is a one-file change.

export interface ReadinessCheck {
  key: string
  label: string          // shown when NOT met — the "needs a quick look" line
  weight: number
  met: boolean
  href: string
}
export interface Readiness {
  score: number // 0..100
  checks: ReadinessCheck[]
  attention: ReadinessCheck[]
  stats: {
    events: number
    guests: number
    invitedGuests: number
    respondedHouseholds: number
    households: number
    attending: number
    vendorsBooked: number
    openTasks: number
    overdueTasks: number
  }
}

export async function computeReadiness(siteId: string): Promise<Readiness> {
  const supabase = await createClient()

  const [
    { data: events }, { data: guests }, { data: invitations }, { data: responses },
    { data: households }, { data: vendors }, { data: tasks }, { data: budget },
    { count: tokens }, { data: site },
  ] = await Promise.all([
    supabase.from('events').select('id, venue_name, starts_at').eq('site_id', siteId).is('archived_at', null),
    supabase.from('guests').select('id, household_id').eq('site_id', siteId).is('archived_at', null),
    supabase.from('invitations').select('guest_id').eq('site_id', siteId),
    supabase.from('responses').select('guest_id, status').eq('site_id', siteId),
    supabase.from('households').select('id').eq('site_id', siteId).is('archived_at', null),
    supabase.from('vendors').select('id, status').eq('site_id', siteId).is('archived_at', null),
    supabase.from('tasks').select('id, status, due_date').eq('site_id', siteId).is('archived_at', null),
    supabase.from('budget_items').select('estimated_amount, actual_amount, paid_amount').eq('site_id', siteId).is('archived_at', null),
    supabase.from('guest_access_tokens').select('id', { count: 'exact', head: true }).eq('site_id', siteId).eq('revoked', false),
    supabase.from('sites').select('status').eq('id', siteId).maybeSingle(),
  ])

  // Upcoming vendor payments: overdue, or due within 14 days (attention only).
  const soonStr = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  const todayStr = new Date().toISOString().slice(0, 10)
  const { data: duePayments } = await supabase
    .from('vendor_payments')
    .select('id, due_date')
    .eq('site_id', siteId).is('archived_at', null).eq('status', 'scheduled').lte('due_date', soonStr)
  const overduePay = (duePayments ?? []).filter((p) => p.due_date < todayStr).length
  const dueSoonPay = (duePayments ?? []).length

  const guestIds = new Set((guests ?? []).map((g) => g.id))
  const invitedGuests = new Set((invitations ?? []).map((i) => i.guest_id).filter((id) => guestIds.has(id)))
  const guestById = new Map((guests ?? []).map((g) => [g.id, g]))
  const respondedHouseholds = new Set(
    (responses ?? []).map((r) => guestById.get(r.guest_id)?.household_id).filter(Boolean),
  )
  const attending = (responses ?? []).filter((r) => r.status === 'attending' && guestIds.has(r.guest_id)).length
  const booked = (vendors ?? []).filter((v) => v.status === 'booked').length
  const openTasks = (tasks ?? []).filter((t) => t.status !== 'done')
  const overdue = openTasks.filter((t) => t.due_date && new Date(t.due_date) < new Date()).length
  const estTotal = (budget ?? []).reduce((n, b) => n + (b.actual_amount ?? b.estimated_amount ?? 0), 0)
  const paidTotal = (budget ?? []).reduce((n, b) => n + (b.paid_amount ?? 0), 0)
  const hhCount = (households ?? []).length

  const checks: ReadinessCheck[] = [
    { key: 'events', weight: 10, met: (events ?? []).length > 0,
      label: 'Add your first event', href: '/events' },
    { key: 'event_details', weight: 12, met: (events ?? []).length > 0 && (events ?? []).every((e) => e.venue_name && e.starts_at),
      label: 'Give every event a venue and start time', href: '/events' },
    { key: 'published', weight: 10, met: site?.status === 'published',
      label: 'Publish your website', href: '/website' },
    { key: 'guests', weight: 10, met: guestIds.size > 0,
      label: 'Build your guest list', href: '/guests' },
    { key: 'all_invited', weight: 12, met: guestIds.size > 0 && invitedGuests.size === guestIds.size,
      label: 'Invite every guest to at least one event', href: '/guests' },
    { key: 'links_out', weight: 12, met: (tokens ?? 0) > 0,
      label: 'Generate and share invitation links', href: '/invitations' },
    { key: 'responses', weight: 12, met: hhCount > 0 && respondedHouseholds.size >= hhCount / 2,
      label: 'Chase RSVPs — under half of households have replied', href: '/rsvps' },
    { key: 'vendor_booked', weight: 10, met: booked > 0,
      label: 'Book your first vendor', href: '/vendors' },
    { key: 'no_overdue', weight: 6, met: overdue === 0,
      label: `Clear ${overdue} overdue task${overdue === 1 ? '' : 's'}`, href: '/tasks' },
    { key: 'budget_health', weight: 6, met: estTotal === 0 || paidTotal <= estTotal,
      label: 'Payments have overtaken the budget — review lines', href: '/budget' },
    { key: 'payments_due', weight: 0, met: dueSoonPay === 0,
      label: overduePay > 0
        ? `${overduePay} vendor payment${overduePay === 1 ? '' : 's'} overdue`
        : `${dueSoonPay} vendor payment${dueSoonPay === 1 ? '' : 's'} due within 14 days`,
      href: '/payments' },
  ]

  const total = checks.reduce((n, c) => n + c.weight, 0)
  const earned = checks.filter((c) => c.met).reduce((n, c) => n + c.weight, 0)

  return {
    score: Math.round((earned / total) * 100),
    checks,
    attention: checks.filter((c) => !c.met),
    stats: {
      events: (events ?? []).length,
      guests: guestIds.size,
      invitedGuests: invitedGuests.size,
      respondedHouseholds: respondedHouseholds.size,
      households: hhCount,
      attending,
      vendorsBooked: booked,
      openTasks: openTasks.length,
      overdueTasks: overdue,
    },
  }
}
