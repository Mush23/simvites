import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { toCsv, csvResponse } from '@/lib/csv'

/** Guest list CSV. Auth-gated; RLS scopes every row to the caller's org. */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorised', { status: 401 })
  const site = await getPrimarySite()
  if (!site) return new Response('No site', { status: 404 })

  const [{ data: households }, { data: guests }] = await Promise.all([
    supabase.from('households').select('id, name, side').eq('site_id', site.siteId).is('archived_at', null),
    supabase.from('guests').select('household_id, full_name, email, is_child, plus_one_allowed, dietary')
      .eq('site_id', site.siteId).is('archived_at', null).order('created_at'),
  ])
  const hh = new Map((households ?? []).map((h) => [h.id, h]))

  const csv = toCsv(
    ['Household', 'Side', 'Guest', 'Email', 'Child', 'Plus one allowed'],
    (guests ?? []).map((g) => [
      hh.get(g.household_id)?.name ?? '', hh.get(g.household_id)?.side ?? '',
      g.full_name, g.email ?? '', g.is_child ? 'yes' : '', g.plus_one_allowed ? 'yes' : '',
    ]),
  )
  return csvResponse('guests.csv', csv)
}
