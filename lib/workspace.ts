import { createClient } from '@/lib/supabase/server'

export interface Workspace {
  siteId: string
  title: string
  slug: string
  orgId: string
  status: string
  isUnlocked: boolean
  /** 'owner' when the user's org owns this site, else 'collaborator'. */
  role: 'owner' | 'collaborator'
  /** How many sites this user can reach — >1 means the UI is hiding some. */
  accessibleCount: number
}

interface SiteRow {
  id: string
  title: string
  slug: string
  org_id: string
  status: string
  is_unlocked: boolean
}

/**
 * The signed-in user's primary site (RLS returns only sites they can access).
 *
 * M1 — this used to be `order('created_at').limit(1)`: the OLDEST site the
 * user could reach, full stop. Combined with `addCollaborator`, which creates
 * a membership for any email with no acceptance step, that was a workspace
 * takeover: add someone to an org older than theirs and every screen in their
 * account — guests, budget, editor, exports — silently resolved to YOUR site,
 * with no way back because there is no site switcher. A stranger needed
 * nothing but their email address, and the same thing happened by accident the
 * first time a planner or parent was added to an older org.
 *
 * Ownership now wins over age. Being added to someone else's org can no longer
 * displace the wedding you actually own; at worst it appends a site you can
 * reach. `accessibleCount` is returned so the UI can tell the user when that
 * has happened rather than silently picking for them.
 */
export async function getPrimarySite(): Promise<Workspace | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: sites }, { data: memberships }] = await Promise.all([
    supabase
      .from('sites')
      .select('id, title, slug, org_id, status, is_unlocked')
      .order('created_at', { ascending: true }),
    // RLS: `memberships_read` lets a user see their own rows.
    supabase.from('memberships').select('org_id, role').eq('user_id', user.id),
  ])

  const rows = (sites ?? []) as SiteRow[]
  if (!rows.length) return null

  const ownedOrgs = new Set(
    ((memberships ?? []) as { org_id: string; role: string }[])
      .filter((m) => m.role === 'owner')
      .map((m) => m.org_id),
  )

  // Oldest site in an org the user OWNS; otherwise oldest they can reach.
  const chosen = rows.find((s) => ownedOrgs.has(s.org_id)) ?? rows[0]

  return {
    siteId: chosen.id,
    title: chosen.title,
    slug: chosen.slug,
    orgId: chosen.org_id,
    status: chosen.status,
    isUnlocked: chosen.is_unlocked,
    role: ownedOrgs.has(chosen.org_id) ? 'owner' : 'collaborator',
    accessibleCount: rows.length,
  }
}
