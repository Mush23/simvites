'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface CreateSiteState {
  error?: string
}

/** Normalise a user-typed slug into a safe subdomain label. */
function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

const RESERVED = new Set(['www', 'app', 'api', 'admin', 'mail', 'assets', 'dashboard', 'login', 'auth'])

export async function createSiteAction(
  _prev: CreateSiteState,
  formData: FormData,
): Promise<CreateSiteState> {
  const name = String(formData.get('name') ?? '').trim()
  const slug = normalizeSlug(String(formData.get('slug') ?? ''))

  if (!name) return { error: 'Please enter a name for your site.' }
  if (!slug) return { error: 'Please enter a valid web address.' }
  if (RESERVED.has(slug)) return { error: 'That address is reserved — pick another.' }

  const supabase = await createClient()

  // Resolve (or create) the user's organization.
  const { data: orgId, error: orgError } = await supabase.rpc('ensure_personal_org', {
    p_name: `${name} — organization`,
  })
  if (orgError || !orgId) {
    return { error: orgError?.message ?? 'Could not resolve your organization.' }
  }

  const { error } = await supabase.rpc('create_site_from_template', {
    p_org_id: orgId,
    p_template_slug: 'editorial-luxe',
    p_name: name,
    p_slug: slug,
  })

  if (error) {
    if (/duplicate key|unique|sites_slug/i.test(error.message)) {
      return { error: 'That web address is already taken — try another.' }
    }
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
