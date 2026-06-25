import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { hashToken } from '@/lib/tokens'
import { GUEST_COOKIE, signGuestSession } from '@/lib/guest-session'
import { getSubdomain } from '@/lib/tenant'

/**
 * Guest entry point. The personalised link is `/i/<rawToken>`. We hash the
 * token, validate the invitation, set an HttpOnly guest-session cookie, and
 * redirect to the clean RSVP URL — the raw token never lingers in the address
 * bar (brief §10).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ site: string; token: string }> },
) {
  const { site: slug, token } = await params

  // On a real subdomain the clean URL is /rsvp; on local path access it's
  // /s/<slug>/rsvp.
  const onSubdomain = !!getSubdomain(request.headers.get('host'))
  const cleanPath = onSubdomain ? '/rsvp' : `/s/${slug}/rsvp`
  const redirect = (ok: boolean) =>
    NextResponse.redirect(new URL(ok ? cleanPath : `${cleanPath}?invalid=1`, request.url))

  const supabase = createAdminClient()
  const { data: inv } = await supabase
    .from('invitations')
    .select('id, org_id, household_id, site_id, revoked_at, expires_at, access_count, sites!inner(slug)')
    .eq('token_hash', hashToken(token))
    .maybeSingle()

  const site = inv?.sites as unknown as { slug: string } | undefined
  const expired = inv?.expires_at ? new Date(inv.expires_at) < new Date() : false

  if (!inv || site?.slug !== slug.toLowerCase() || inv.revoked_at || expired) {
    return redirect(false)
  }

  await supabase
    .from('invitations')
    .update({ last_accessed_at: new Date().toISOString(), access_count: (inv.access_count ?? 0) + 1 })
    .eq('id', inv.id)

  // Best-effort open tracking.
  await supabase.from('tracking_events').insert({
    org_id: inv.org_id,
    site_id: inv.site_id,
    household_id: inv.household_id,
    type: 'invite_opened',
  }).then(() => {}, () => {})

  const res = redirect(true)
  res.cookies.set(GUEST_COOKIE, signGuestSession({ householdId: inv.household_id, siteId: inv.site_id }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 120, // 120 days
  })
  return res
}
