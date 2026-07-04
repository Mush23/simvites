'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { track } from '@/lib/analytics'
import type { SiteData } from '@/lib/puck/config'

/** Persist a page's Puck document as the draft (RLS: can_write_site). */
export async function savePageDraft(pageId: string, data: SiteData) {
  const supabase = await createClient()
  const { error } = await supabase.from('pages').update({ puck_data: data }).eq('id', pageId)
  if (error) return { error: error.message }
  return { ok: true }
}

/**
 * Publish: serialise pages + visible events + theme + labels into an immutable
 * published_versions snapshot and flip the site to 'published'. The public site
 * reads ONLY this snapshot (handoff §7). Saves the draft first.
 */
export async function saveAndPublish(siteId: string, pageId: string, data: SiteData) {
  const saved = await savePageDraft(pageId, data)
  if ('error' in saved && saved.error) return saved

  // The business model (handoff §7): free tier = draft + preview only.
  const workspace = await getPrimarySite()
  if (!workspace?.isUnlocked) {
    return { error: 'locked', locked: true as const }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: site }, { data: pages }, { data: events }] = await Promise.all([
    supabase.from('sites').select('title, slug, theme, labels').eq('id', siteId).maybeSingle(),
    supabase.from('pages').select('slug, title, puck_data, is_home, nav_order, hidden').eq('site_id', siteId),
    supabase
      .from('events')
      .select('id, name, starts_at, ends_at, venue_name, address, description, accent, visibility, on_website, sort_order')
      .eq('site_id', siteId)
      .is('archived_at', null)
      .neq('visibility', 'hidden')
      .eq('on_website', true)
      .order('sort_order', { ascending: true })
      .order('starts_at', { ascending: true }),
  ])
  if (!site) return { error: 'Site not found.' }

  const snapshot = {
    schema_version: 1,
    title: site.title,
    slug: site.slug,
    theme: site.theme,
    labels: site.labels,
    pages: pages ?? [],
    events: events ?? [],
  }

  const { error: insErr } = await supabase
    .from('published_versions')
    .insert({ site_id: siteId, snapshot, summary: 'Published from the editor', published_by: user?.id ?? null })
  if (insErr) return { error: insErr.message }

  const { error: updErr } = await supabase.from('sites').update({ status: 'published' }).eq('id', siteId)
  if (updErr) return { error: updErr.message }

  await supabase.from('activity_log').insert({
    site_id: siteId, actor_id: user?.id ?? null, verb: 'published', entity_type: 'site', entity_id: siteId,
  })
  if (user) track('site_published', user.id, { site_id: siteId })

  revalidatePath('/website')
  return { ok: true }
}
