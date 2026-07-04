'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { track } from '@/lib/analytics'

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
  const { data: siteId, error } = await supabase.rpc('create_org_and_site', {
    p_org_name: orgName || `${siteTitle} team`,
    p_site_title: siteTitle,
    p_slug: slug,
  })
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { error: 'That web address is taken — try another.' }
    return { error: error.message }
  }

  // Starter events the host picked — the site opens already structured.
  const picked = formData.getAll('events').map(String).filter(Boolean)
  if (siteId && picked.length) {
    await supabase.from('events').insert(
      picked.map((name, i) => ({ site_id: siteId, name, sort_order: i })),
    )
  }

  // Template choice: store on the site and seed the home page with the
  // template's starter document (title personalised).
  const { getTemplate, DEFAULT_TEMPLATE_KEY } = await import('@/lib/templates/registry')
  const template = getTemplate(String(formData.get('template') ?? DEFAULT_TEMPLATE_KEY))
  if (siteId) {
    const doc = structuredClone(template.starterDoc)
    for (const block of doc.content) {
      if (block.type === 'Hero') (block.props as { title?: string }).title = siteTitle
      if (block.type === 'SiteFooterBlock') (block.props as { names?: string }).names = siteTitle
    }
    await supabase.from('sites').update({ theme: { template: template.key } }).eq('id', siteId)
    await supabase.from('pages').update({ puck_data: doc }).eq('site_id', siteId).eq('is_home', true)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) track('site_created', user.id, { site_id: siteId, starter_events: picked.length })

  redirect('/dashboard')
}
