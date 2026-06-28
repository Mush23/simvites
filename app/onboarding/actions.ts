'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface OnboardingState {
  error?: string
}

function normalizeSlug(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

const RESERVED = new Set(['www', 'app', 'api', 'admin', 'dashboard', 'login', 'auth', 'onboarding', 'i', 's'])

export async function createWorkspace(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const orgName = String(formData.get('org_name') ?? '').trim()
  const siteTitle = String(formData.get('site_title') ?? '').trim()
  const slug = normalizeSlug(String(formData.get('slug') ?? ''))

  if (!siteTitle) return { error: 'Please name your wedding site.' }
  if (!slug) return { error: 'Please choose a web address.' }
  if (RESERVED.has(slug)) return { error: 'That address is reserved — pick another.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('create_org_and_site', {
    p_org_name: orgName || `${siteTitle} team`,
    p_site_title: siteTitle,
    p_slug: slug,
  })
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { error: 'That web address is taken — try another.' }
    return { error: error.message }
  }

  redirect('/dashboard')
}
