import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/safe-redirect'

/**
 * Email-confirmation / OAuth callback. Supabase redirects here with a `code`;
 * we exchange it for a session, then send the user on to `next`.
 *
 * M7: `next` was previously concatenated onto the origin without validation,
 * which is an open redirect. See lib/safe-redirect.ts for what that allowed.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Resolved against origin: even a path that slipped through cannot leave it.
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth', origin))
}
