import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { GuestManager, type ManagedHousehold, type ManagedEvent } from './guest-manager'

export const metadata = { title: 'Guests · Simvites' }

export default async function GuestsPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  await requireUser()
  const { siteId } = await params
  const supabase = await createClient()

  const { data: site } = await supabase
    .from('sites')
    .select('id, name')
    .eq('id', siteId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!site) notFound()

  const [{ data: eventRows }, { data: householdRows }, { data: guestRows }, { data: inviteRows }] =
    await Promise.all([
      supabase.from('events').select('id, name, event_date').eq('site_id', siteId).is('deleted_at', null).order('order'),
      supabase.from('households').select('id, name, code').eq('site_id', siteId).is('deleted_at', null).order('created_at'),
      supabase.from('guests').select('id, name, is_child, household_id').eq('site_id', siteId).is('deleted_at', null).order('created_at'),
      supabase.from('household_event_invites').select('household_id, event_id, invited, household_cap').eq('site_id', siteId),
    ])

  const events: ManagedEvent[] = (eventRows ?? []).map((e) => ({
    id: e.id as string,
    name: e.name as string,
  }))

  const households: ManagedHousehold[] = (householdRows ?? []).map((h) => ({
    id: h.id as string,
    name: h.name as string,
    code: h.code as string,
    guests: (guestRows ?? [])
      .filter((g) => g.household_id === h.id)
      .map((g) => ({ id: g.id as string, name: g.name as string, isChild: g.is_child as boolean })),
    invites: Object.fromEntries(
      (inviteRows ?? [])
        .filter((i) => i.household_id === h.id)
        .map((i) => [i.event_id as string, { invited: i.invited as boolean, cap: i.household_cap as number }]),
    ),
  }))

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-[0.7rem] uppercase tracking-wide-soft text-muted-foreground hover:text-gold-ink"
          >
            ← Sites
          </Link>
          <h1 className="mt-2 font-heading text-3xl font-light">{site.name} · Guests</h1>
        </div>
      </div>

      <GuestManager siteId={siteId} events={events} households={households} />
    </main>
  )
}
