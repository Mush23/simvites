'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { track } from '@/lib/analytics'
import type { SiteData } from '@/lib/puck/config'

/**
 * Upload an image to the PUBLIC site-assets bucket and return its URL —
 * paste it into any image field in the editor. 10MB cap, images only.
 */
export async function uploadSiteImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  const workspace = await getPrimarySite()
  if (!workspace) return { error: 'No site.' }
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'Choose an image first.' }
  if (file.size > 10 * 1024 * 1024) return { error: 'Images are limited to 10 MB.' }
  if (!file.type.startsWith('image/')) return { error: 'That file is not an image.' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const admin = createAdminClient()
  const safe = file.name.replace(/[^\w.\-]+/g, '_').slice(-80)
  const path = `${workspace.siteId}/${crypto.randomUUID()}-${safe}`
  const { error } = await admin.storage.from('site-assets')
    .upload(path, file, { contentType: file.type })
  if (error) return { error: error.message }
  const { data } = admin.storage.from('site-assets').getPublicUrl(path)
  return { url: data.publicUrl }
}

/**
 * Import a photo picked from search into OUR site-assets bucket (never
 * hotlinked: external hosts fail next/image's allowlist and can rot).
 * https only, no IP-literal/localhost hosts, image content-type, 15 MB cap.
 */
export async function importImageFromUrl(url: string): Promise<{ url?: string; error?: string }> {
  const workspace = await getPrimarySite()
  if (!workspace) return { error: 'No site.' }

  let parsed: URL
  try { parsed = new URL(url) } catch { return { error: 'That is not a valid link.' } }
  if (parsed.protocol !== 'https:') return { error: 'Only https image links are allowed.' }
  if (/^(localhost$|\d+\.\d+\.\d+\.\d+$|\[)/i.test(parsed.hostname)) return { error: 'That host is not allowed.' }

  let res: Response
  try {
    res = await fetch(parsed, { redirect: 'follow', signal: AbortSignal.timeout(15_000) })
  } catch { return { error: 'Could not fetch that photo — try another one.' } }
  const type = res.headers.get('content-type')?.split(';')[0] ?? ''
  if (!res.ok || !type.startsWith('image/')) return { error: 'That link is not an image.' }
  const buf = await res.arrayBuffer()
  if (buf.byteLength > 15 * 1024 * 1024) return { error: 'That image is too large (15 MB max).' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const admin = createAdminClient()
  const ext = type.slice(6).replace('jpeg', 'jpg').replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${workspace.siteId}/${crypto.randomUUID()}.${ext}`
  const { error } = await admin.storage.from('site-assets').upload(path, buf, { contentType: type })
  if (error) return { error: error.message }
  const { data } = admin.storage.from('site-assets').getPublicUrl(path)
  return { url: data.publicUrl }
}

/** Save the couple's style choices (fonts, background, accent, glow, hover). */
export async function updateSiteStyle(style: Record<string, string>) {
  const workspace = await getPrimarySite()
  if (!workspace) return { error: 'No site.' }
  const supabase = await createClient()
  const { data: cur } = await supabase.from('sites').select('theme').eq('id', workspace.siteId).maybeSingle()
  const theme = { ...((cur?.theme as Record<string, unknown>) ?? {}), ...style }
  const { error } = await supabase.from('sites').update({ theme }).eq('id', workspace.siteId)
  if (error) return { error: error.message }
  revalidatePath('/website')
  return { ok: true }
}

// ── Multi-page management (Sprint D). RLS (can_write_site) scopes writes. ──

/** Slugs that would shadow built-in routes under /s/[siteSlug]/. */
const RESERVED_PAGE_SLUGS = new Set(['rsvp'])

export async function createPage(title: string): Promise<{ id?: string; error?: string }> {
  const workspace = await getPrimarySite()
  if (!workspace) return { error: 'No site.' }
  const clean = title.trim().slice(0, 60)
  if (!clean) return { error: 'Give the page a name.' }
  const base = clean.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'page'

  const supabase = await createClient()
  const { data: existing } = await supabase.from('pages').select('slug, nav_order').eq('site_id', workspace.siteId)
  const taken = new Set((existing ?? []).map((p) => p.slug))
  let slug = base
  for (let n = 2; RESERVED_PAGE_SLUGS.has(slug) || taken.has(slug); n++) slug = `${base}-${n}`
  const nav_order = Math.max(0, ...(existing ?? []).map((p) => p.nav_order ?? 0)) + 1

  const { data: row, error } = await supabase
    .from('pages')
    .insert({
      site_id: workspace.siteId, title: clean, slug, is_home: false, nav_order, hidden: false,
      puck_data: { root: { props: {} }, content: [] },
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  revalidatePath('/website')
  return { id: row.id }
}

export async function renamePage(pageId: string, title: string) {
  const clean = title.trim().slice(0, 60)
  if (!clean) return { error: 'Give the page a name.' }
  const supabase = await createClient()
  const { error } = await supabase.from('pages').update({ title: clean }).eq('id', pageId)
  if (error) return { error: error.message }
  revalidatePath('/website')
  return { ok: true }
}

export async function setPageHidden(pageId: string, hidden: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('pages').update({ hidden }).eq('id', pageId).eq('is_home', false)
  if (error) return { error: error.message }
  revalidatePath('/website')
  return { ok: true }
}

export async function deletePage(pageId: string) {
  const supabase = await createClient()
  // The home page is never deletable — it is the site.
  const { error } = await supabase.from('pages').delete().eq('id', pageId).eq('is_home', false)
  if (error) return { error: error.message }
  revalidatePath('/website')
  return { ok: true }
}

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

  revalidatePath('/website')
  return { ok: true }
}
