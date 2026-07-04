import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { hashToken } from '@/lib/tokens'
import { GUEST_COOKIE, signGuestSession } from '@/lib/guest-session'
import { getSubdomain } from '@/lib/tenant'

/**
 * Guest entry (handoff §5). Personalised link = /i/<raw>. We hash (peppered)
 * and look up the token server-side with the service role, check revoked /
 * expired / site match, set a signed HttpOnly session cookie scoped to the
 * household, and redirect to the clean /rsvp URL — the raw token never
 * lingers in the address bar.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteSlug: string; token: string }> },
) {
  const { siteSlug, token } = await params

  // On a real subdomain the clean path is /rsvp; on the path-routed dev URL
  // it's /s/<slug>/rsvp.
  const onSubdomain = !!getSubdomain(request.headers.get('host'))
  const cleanPath = onSubdomain ? '/rsvp' : `/s/${siteSlug}/rsvp`
  const redirect = (state?: string) =>
    NextResponse.redirect(new URL(state ? `${cleanPath}?link=${state}` : cleanPath, request.url))

  const supabase = createAdminClient()
  const { data: row } = await supabase
    .from('guest_access_tokens')
    .select('id, household_id, site_id, revoked, expires_at, sites!inner(slug)')
    .eq('token_hash', hashToken(token))
    .maybeSingle()

  if (!row) return redirect('invalid')
  const site = row.sites as unknown as { slug: string }
  if (site.slug !== siteSlug.toLowerCase()) return redirect('invalid')
  if (row.revoked) return redirect('revoked')
  if (row.expires_at && new Date(row.expires_at) < new Date()) return redirect('expired')

  // Open tracking — powers the host's "opened but not responded" chase list.
  await supabase.from('activity_log').insert({
    site_id: row.site_id,
    verb: 'invite_opened',
    entity_type: 'household',
    entity_id: row.household_id,
  }).then(() => {}, () => {}) // best-effort; never block the guest

  const res = redirect()
  res.cookies.set(
    GUEST_COOKIE,
    signGuestSession({ householdId: row.household_id, siteId: row.site_id }),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 180, // 180 days — the wedding season
    },
  )
  return res
}
