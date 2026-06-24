import { NextResponse, type NextRequest } from 'next/server'
import { getSubdomain } from '@/lib/tenant'

// ─────────────────────────────────────────────────────────────────────────
// Multi-tenant edge proxy (Next 16's successor to `middleware`).
// vercel/platforms model.
//
//   <slug>.simvites.co.uk/<path>   →  rewrite to  /s/<slug>/<path>
//   simvites.co.uk / www / app     →  marketing site + app shell (untouched)
//
// The rewrite is invisible to the browser: the guest sees their own subdomain,
// Next renders the tenant route group under app/s/[site].
// ─────────────────────────────────────────────────────────────────────────

export const config = {
  // Run on everything except Next internals and static files.
  matcher: ['/((?!_next/|_static/|_vercel/|favicon.ico|.*\\..*).*)'],
}

export function proxy(req: NextRequest) {
  const url = req.nextUrl
  const host = req.headers.get('host')
  const subdomain = getSubdomain(host)

  // Apex / reserved → marketing + dashboard, served as-is.
  if (!subdomain) {
    return NextResponse.next()
  }

  // Tenant → rewrite into the /s/[site] route group, preserving path + query.
  const rewriteUrl = new URL(`/s/${subdomain}${url.pathname}`, req.url)
  rewriteUrl.search = url.search
  return NextResponse.rewrite(rewriteUrl)
}
