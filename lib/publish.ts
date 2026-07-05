import { createClient } from '@/lib/supabase/server'
import { track } from '@/lib/analytics'

/**
 * Serialise pages + visible events + theme + labels into an immutable
 * published_versions snapshot and flip the site to 'published'. The public
 * site reads ONLY this snapshot (handoff §7). Shared by the editor's
 * Publish and the app header's Publish (overhaul). Caller checks unlock.
 */
export async function publishSnapshot(siteId: string, summary = 'Published from the editor') {
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
    .insert({ site_id: siteId, snapshot, summary, published_by: user?.id ?? null })
  if (insErr) return { error: insErr.message }

  // Lifecycle: first publish starts the included-hosting clock (~18 months);
  // renewals/extensions are managed in platform admin (and later, billing).
  const { data: cur } = await supabase.from('sites').select('expires_at').eq('id', siteId).maybeSingle()
  const expiry = new Date(); expiry.setMonth(expiry.getMonth() + 18)
  const { error: updErr } = await supabase.from('sites')
    .update({ status: 'published', ...(cur?.expires_at ? {} : { expires_at: expiry.toISOString() }) })
    .eq('id', siteId)
  if (updErr) return { error: updErr.message }

  await supabase.from('activity_log').insert({
    site_id: siteId, actor_id: user?.id ?? null, verb: 'published', entity_type: 'site', entity_id: siteId,
  })
  if (user) track('site_published', user.id, { site_id: siteId })
  return { ok: true as const }
}
