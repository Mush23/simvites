'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
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

// ── AI section composer (guarded): prompt → a written, allowlisted block. ──

const AI_BLOCK_TYPES = new Set(['StoryBlock', 'Faq', 'GiftsNote', 'Travel', 'EventDetail'])

export async function aiComposeSection(prompt: string): Promise<{
  type?: string; props?: Record<string, unknown>; error?: string; notConfigured?: boolean
}> {
  const { aiConfigured, chat } = await import('@/lib/ai')
  if (!aiConfigured()) return { notConfigured: true }
  const workspace = await getPrimarySite()
  if (!workspace) return { error: 'No site.' }
  const clean = prompt.trim().slice(0, 600)
  if (!clean) return { error: 'Describe the section first.' }

  const system =
    'You write sections for a couple\'s wedding website. Return ONLY a JSON object, no prose: ' +
    '{"type": one of "StoryBlock"|"Faq"|"GiftsNote"|"Travel"|"EventDetail", "props": {...}}.\n' +
    'Props by type:\n' +
    '- StoryBlock: {"kicker": string, "title": string, "paragraphs": [{"text": string}]} (1-3 warm paragraphs)\n' +
    '- Faq: {"heading": string, "items": [{"q": string, "a": string}]} (3-6 questions)\n' +
    '- GiftsNote: {"heading": string, "body": string}\n' +
    '- Travel: {"heading": string, "body": string} (line breaks allowed)\n' +
    '- EventDetail: {"title": string, "meta": string, "body": string}\n' +
    'Pick the type that best fits the request. Write in the couple\'s own warm voice, ' +
    'specific over generic, UK English, and never use dashes as punctuation.'

  const out = await chat(system, [{ role: 'user', content: clean }], 1200)
  if (!out) return { error: 'The AI is unavailable right now. Try again in a moment.' }

  try {
    const start = out.indexOf('{')
    const end = out.lastIndexOf('}')
    if (start === -1 || end === -1) return { error: 'The AI gave an unusable answer. Try rephrasing.' }
    const parsed = JSON.parse(out.slice(start, end + 1)) as { type?: unknown; props?: unknown }
    if (typeof parsed.type !== 'string' || !AI_BLOCK_TYPES.has(parsed.type) ||
        typeof parsed.props !== 'object' || parsed.props === null) {
      return { error: 'The AI gave an unusable answer. Try rephrasing.' }
    }
    return { type: parsed.type, props: parsed.props as Record<string, unknown> }
  } catch {
    return { error: 'The AI gave an unusable answer. Try rephrasing.' }
  }
}

// ── Multi-page management (Sprint D). RLS (can_write_site) scopes writes. ──

/** Slugs that would shadow built-in routes under /s/[siteSlug]/. */
const RESERVED_PAGE_SLUGS = new Set(['rsvp', 'schedule'])

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

  const { publishSnapshot } = await import('@/lib/publish')
  const res = await publishSnapshot(siteId)
  if ('error' in res && res.error) return res

  revalidatePath('/website')
  return { ok: true }
}
