import { notFound } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { createAdminClient } from '@/lib/supabase/server'

/** Sites CSV for the admin register (4b): one row per site with owner,
 * status, unlock, counts and last RSVP. Platform-admin only. Counts come
 * from the same grouped aggregates as the dashboard (admin_response_stats /
 * admin_guest_counts) — one row per site, never a full-table fetch. */
export async function GET() {
  const admin = await requirePlatformAdmin()
  if (!admin) notFound()

  const db = createAdminClient()
  const [{ data: sites }, { data: memberships }, { data: guestStats }, { data: respStats }] = await Promise.all([
    db.from('sites').select('id, org_id, title, slug, status, is_unlocked, expires_at, archived_at, created_at')
      .order('created_at', { ascending: false }),
    db.from('memberships').select('org_id, profiles(email)').eq('role', 'owner'),
    db.rpc('admin_guest_counts'),
    db.rpc('admin_response_stats'),
  ])

  const ownerByOrg = new Map<string, string>()
  for (const m of (memberships ?? []) as { org_id: string; profiles: { email: string | null } | { email: string | null }[] | null }[]) {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    if (p?.email && !ownerByOrg.has(m.org_id)) ownerByOrg.set(m.org_id, p.email)
  }
  const guestsBy = new Map(((guestStats ?? []) as { site_id: string; total: number }[])
    .map((s) => [s.site_id, Number(s.total)]))
  const rsvpsBy = new Map(((respStats ?? []) as { site_id: string; total: number; last_at: string | null }[])
    .map((s) => [s.site_id, { total: Number(s.total), last: s.last_at }]))

  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = ['title', 'slug', 'owner_email', 'status', 'unlocked', 'created_at', 'expires_at', 'guests', 'rsvps', 'last_rsvp']
  const lines = [header.join(',')]
  for (const s of sites ?? []) {
    const r = rsvpsBy.get(s.id)
    lines.push([
      esc(s.title), esc(s.slug), esc(ownerByOrg.get(s.org_id)),
      esc(s.archived_at ? 'archived' : s.status), esc(s.is_unlocked),
      esc(s.created_at), esc(s.expires_at),
      esc(guestsBy.get(s.id) ?? 0), esc(r?.total ?? 0), esc(r?.last),
    ].join(','))
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sites.csv"',
    },
  })
}
