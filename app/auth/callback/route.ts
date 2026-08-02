import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/safe-redirect'

/**
 * Email-confirmation / magic-link / OAuth callback.
 *
 * Two ways in, because they fail differently:
 *
 *  `token_hash`  — verifyOtp. Carries everything needed in the link itself, so
 *                  it works on ANY device. Preferred.
 *  `code`        — PKCE. Requires the `code_verifier` cookie that the browser
 *                  which REQUESTED the link stored. Same device only.
 *
 * Measured, not assumed: with the verifier cookie absent, exchangeCodeForSession
 * fails in ~1ms without a network call — "PKCE code verifier not found in
 * storage". With it, the same call reaches the server and is judged on the code.
 * So requesting a link on a laptop and opening it on a phone cannot work, and
 * people do that constantly.
 *
 * Supporting token_hash here is half the fix; the other half is a dashboard
 * change, because the emailed URL comes from Supabase's template. Until the
 * template uses {{ .TokenHash }}, links keep arriving as `code` and stay
 * same-device — but now they fail with an explanation instead of a blank form.
 * See docs/LAUNCH-READINESS.md.
 *
 * M7: `next` was previously concatenated onto the origin without validation,
 * which is an open redirect. See lib/safe-redirect.ts.
 */

// Only the flows this app actually sends. An unrecognised `type` is treated as
// no token at all rather than passed through to the auth server.
const OTP_TYPES: EmailOtpType[] = ['magiclink', 'signup', 'invite', 'recovery', 'email_change', 'email']

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const next = safeNextPath(searchParams.get('next'))
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const rawType = searchParams.get('type') ?? ''
  const type = OTP_TYPES.includes(rawType as EmailOtpType) ? (rawType as EmailOtpType) : null

  // Device-independent path first: nothing stored client-side is required.
  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) return NextResponse.redirect(new URL(next, origin))
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Resolved against origin: even a path that slipped through cannot leave it.
      return NextResponse.redirect(new URL(next, origin))
    }
    // The overwhelmingly likely cause, and the one worth naming to the user.
    if (/code verifier/i.test(error.message)) {
      return NextResponse.redirect(new URL('/login?error=other-device', origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth', origin))
}
