'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { track } from '@/lib/analytics'
import { isReservedSlug, normalizeSlug } from '@/lib/reserved-slugs'

export interface OnboardingState {
  error?: string
}

// M13: slug rules live in ONE place now — the router reserves exactly what
// this form refuses to hand out. See lib/reserved-slugs.ts.

export async function createWorkspace(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const orgName = String(formData.get('org_name') ?? '').trim()
  const siteTitle = String(formData.get('site_title') ?? '').trim()
  const slug = normalizeSlug(String(formData.get('slug') ?? ''))

  if (!siteTitle) return { error: 'Please name your wedding site.' }
  if (!slug) return { error: 'Please choose a web address.' }
  if (isReservedSlug(slug)) return { error: 'That address is reserved — pick another.' }

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
    // C1: this used to hand-substitute Hero.title and the footer only, so a
    // brand-new site opened showing the couple's own name above the DEMO
    // couple's parents ("Son of Anil & Meera"), a fabricated hero date and a
    // countdown to someone else's wedding. The partial substitution is what
    // made it read as a bug rather than as placeholder text — and it was the
    // first screen a paying customer saw.
    //
    // applySeed is the one place that knows which props name a wedding, and
    // it is already what the template previews use. Passing empty date and
    // location clears the template's demo values; omitting `families` blanks
    // the family names while keeping the side labels, matching what the block
    // does when a couple adds it by hand. Everything the couple has not told
    // us yet is now absent rather than wrong.
    const { applySeed } = await import('@/lib/templates/seed')
    const doc = applySeed(structuredClone(template.starterDoc), {
      coupleNames: siteTitle,
      dateText: '',
      dateISO: null,
      location: '',
      events: [],
    })
    await supabase.from('sites').update({ theme: { template: template.key } }).eq('id', siteId)
    await supabase.from('pages').update({ puck_data: doc }).eq('site_id', siteId).eq('is_home', true)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) track('site_created', user.id, { site_id: siteId, starter_events: picked.length })

  redirect('/dashboard')
}
