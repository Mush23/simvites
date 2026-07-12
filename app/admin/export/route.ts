import { notFound } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetch-all'

/** Sites CSV for the admin register (4b): one row per site with owner,
 * status, unlock, counts and last RSVP. Platform-admin only. */
export async function GET() {
  const admin = await requirePlatformAdmin()
  if (!admin) notFound()

  const db = createAdminClient()
  const [{ data: sites }, { data: memberships }, guests, responses] = await Promise.all([
    db.from('sites').select('id, org_id, title, slug, status, is_unlocked, expires_at, archived_at, created_at')
      .order('created_at', { ascending: false }),
    db.from('memberships').select('org_id, profiles(email)').eq('role', 'owner'),
    fetchAll<{ site_id: string }>(() => db.from('guests').select('site_id').is('archived_at', null)),
    fetchAll<{ site_id: string; responded_at: string | null }>(() =>
      db.from('responses').select('site_id, responded_at')),
  ])

  const ownerByOrg = new Map<string, string>()
  for (const m of (memberships ?? []) as { org_id: string; profiles: { email: string | null } | { email: string | null }[] | null }[]) {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    if (p?.email && !ownerByOrg.has(m.org_id)) ownerByOrg.set(m.org_id, p.email)
  }
  const count = (rows: { site_id: string }[]) => {
    const m = new Map<string, number>()
    for (const r of rows) m.set(r.site_id, (m.get(r.site_id) ?? 0) + 1)
    return m
  }
  const guestsBy = count(guests)
  const rsvpsBy = count(responses)
  const lastBy = new Map<string, string>()
  for (const r of responses) {
    if (!r.responded_at) continue
    const prev = lastBy.get(r.site_id)
    if (!prev || r.responded_at > prev) lastBy.set(r.site_id, r.responded_at)
  }

  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = ['title', 'slug', 'owner_email', 'status', 'unlocked', 'created_at', 'expires_at', 'guests', 'rsvps', 'last_rsvp']
  const lines = [header.join(',')]
  for (const s of sites ?? []) {
    lines.push([
      esc(s.title), esc(s.slug), esc(ownerByOrg.get(s.org_id)),
      esc(s.archived_at ? 'archived' : s.status), esc(s.is_unlocked),
      esc(s.created_at), esc(s.expires_at),
      esc(guestsBy.get(s.id) ?? 0), esc(rsvpsBy.get(s.id) ?? 0), esc(lastBy.get(s.id)),
    ].join(','))
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sites.csv"',
    },
  })
}
