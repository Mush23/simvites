import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * Platform admin = YOUR login, allowlisted by email in PLATFORM_ADMIN_EMAILS
 * (comma-separated). No separate credentials to leak; gate checked server-side
 * on every admin page/action.
 */
export async function requirePlatformAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const allow = (process.env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  if (!user?.email || !allow.includes(user.email.toLowerCase())) return null
  return user
}
