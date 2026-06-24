import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** The current authenticated user, or null. Safe in Server Components. */
export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/** Require a signed-in user; redirect to /login otherwise. */
export async function requireUser() {
  const user = await getUser()
  if (!user) redirect('/login')
  return user
}
