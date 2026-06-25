import { createClient } from '@/lib/supabase/server'

/** Site ids in an org that have a paid one-time purchase (unlocked). */
export async function paidSiteIds(orgId: string): Promise<Set<string>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('purchases')
    .select('site_id')
    .eq('org_id', orgId)
    .eq('status', 'paid')
  return new Set((data ?? []).map((p) => p.site_id as string).filter(Boolean))
}
