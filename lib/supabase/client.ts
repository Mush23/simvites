'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser Supabase client. Uses the anon key and is subject to RLS — safe to
 * use from client components for the authenticated user's own data.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
