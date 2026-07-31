import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

type CookieToSet = { name: string; value: string; options?: CookieOptions }

/**
 * Server Supabase client bound to the request's auth cookies. Subject to RLS —
 * the authenticated user only sees rows their membership allows.
 * Use inside Server Components, Route Handlers and Server Actions.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll called from a Server Component — safe to ignore when
            // middleware is refreshing the session.
          }
        },
      },
    },
  )
}

/**
 * Service-role client. BYPASSES RLS — never expose to the browser and never
 * import from a client component. Used by trusted server code: publishing
 * snapshots, resolving a tenant by host, and serving a published guest site
 * after validating the opaque invitation token.
 */
export function createAdminClient() {
  // Deliberately a lazy require, not a top-level import: this keeps
  // @supabase/supabase-js out of any module graph that merely imports this file
  // for its other exports. Making it a static import would change bundling, and
  // a dynamic import() would force every caller to become async.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
