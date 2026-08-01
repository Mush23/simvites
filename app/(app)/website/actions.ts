'use server'

import { revalidatePath } from 'next/cache'
import { lookup } from 'node:dns/promises'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import type { SiteData } from '@/lib/puck/config'

// ── SSRF guards for importImageFromUrl (M6) ──────────────────────────────

/** Loopback, private, link-local and cloud-metadata ranges. */
function isPrivateIp(ip: string): boolean {
  const v4 = ip.match(/^(\d+)\.(\d+)\.\d+\.\d+$/)
  if (v4) {
    const a = Number(v4[1])
    const b = Number(v4[2])
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||           // link-local — AWS/GCP metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      a >= 224                              // multicast / reserved
    )
  }
  const v6 = ip.toLowerCase()
  if (v6.startsWith('::ffff:')) return isPrivateIp(v6.slice(7)) // IPv4-mapped
  return (
    v6 === '::1' || v6 === '::' ||
    v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80')
  )
}

/**
 * Returns a user-facing reason to refuse, or null to allow.
 *
 * Resolves DNS and rejects hosts that point anywhere internal. Note this still
 * leaves a DNS-rebinding window — we resolve here and the runtime resolves
 * again when it connects. Closing that properly means dialling the resolved IP
 * with a Host header, which Node's fetch does not expose; the redirect and
 * range checks below are the meaningful part of the defence.
 */
async function disallowedHost(u: URL): Promise<string | null> {
  if (u.protocol !== 'https:') return 'Only https image links are allowed.'
  const host = u.hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
  if (
    host === 'localhost' || host.endsWith('.localhost') ||
    host.endsWith('.internal') || host.endsWith('.local')
  ) return 'That host is not allowed.'
  if (isPrivateIp(host)) return 'That host is not allowed.'
  try {
    const addrs = await lookup(host, { all: true })
    if (!addrs.length) return 'That host could not be resolved.'
    if (addrs.some((a) => isPrivateIp(a.address))) return 'That host is not allowed.'
  } catch {
    return 'That host could not be resolved.'
  }
  return null
}

/**
 * Identify an image by its magic bytes. Returns the content-type to store, or
 * null if it is not a raster format we serve. Deliberately excludes SVG: it is
 * an XML document that can execute script, and nothing in the product needs it.
 */
function sniffImageType(b: Uint8Array): string | null {
  const at = (i: number) => b[i]
  if (b.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'image/jpeg'
  if (
    b.length >= 8 && at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47 &&
    at(4) === 0x0d && at(5) === 0x0a && at(6) === 0x1a && at(7) === 0x0a
  ) return 'image/png'
  if (b.length >= 6 && at(0) === 0x47 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x38) return 'image/gif'
  // RIFF....WEBP
  if (
    b.length >= 12 && at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 &&
    at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50
  ) return 'image/webp'
  return null
}

/** Read a response body, aborting the moment it exceeds `max` bytes. */
async function readCapped(res: Response, max: number): Promise<Uint8Array> {
  const reader = res.body?.getReader()
  if (!reader) throw new Error('no body')
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > max) {
      await reader.cancel()
      throw new Error('too large')
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}

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

  // M15: `file.type` is whatever the client claims. It used to be both the
  // check AND the stored content-type, so `image/svg+xml` sailed through and
  // landed in a PUBLIC bucket — and SVG carries <script>, giving anyone a
  // script-hosting primitive on infrastructure with our name on it. Sniff the
  // real bytes and store the content-type WE determined, not the one we were told.
  const bytes = new Uint8Array(await file.arrayBuffer())
  const sniffed = sniffImageType(bytes)
  if (!sniffed) return { error: 'That file is not a JPG, PNG, WebP or GIF.' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const admin = createAdminClient()
  const safe = file.name.replace(/[^\w.\-]+/g, '_').slice(-80)
  const path = `${workspace.siteId}/${crypto.randomUUID()}-${safe}`
  const { error } = await admin.storage.from('site-assets')
    .upload(path, bytes, { contentType: sniffed })
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

  // M6: the host check used to run once, on the URL the user typed, and then
  // `redirect: 'follow'` went wherever that host pointed — so any https host
  // returning `302 → http://169.254.169.254/…` was fetched with no further
  // checks. Follow redirects MANUALLY and re-validate every hop.
  let res: Response
  let current = parsed
  try {
    for (let hop = 0; ; hop++) {
      if (hop > 5) return { error: 'That link redirects too many times.' }
      const bad = await disallowedHost(current)
      if (bad) return { error: bad }
      res = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(15_000) })
      if (res.status < 300 || res.status >= 400) break
      const location = res.headers.get('location')
      if (!location) break
      current = new URL(location, current) // relative Location is legal
    }
  } catch { return { error: 'Could not fetch that photo — try another one.' } }

  const type = res.headers.get('content-type')?.split(';')[0] ?? ''
  if (!res.ok || !type.startsWith('image/')) return { error: 'That link is not an image.' }
  if (type === 'image/svg+xml') return { error: 'SVG images are not supported — use a JPG or PNG.' }

  // M6: the size cap used to be checked AFTER `await res.arrayBuffer()`, so a
  // hostile host streaming 10 GB exhausted memory before the check ever ran.
  // Trust the declared length when present, then enforce the real cap while
  // reading so a lying or absent Content-Length cannot get past it.
  const MAX = 15 * 1024 * 1024
  const declared = Number(res.headers.get('content-length') ?? '')
  if (Number.isFinite(declared) && declared > MAX) {
    return { error: 'That image is too large (15 MB max).' }
  }
  let buf: Uint8Array
  try {
    buf = await readCapped(res, MAX)
  } catch { return { error: 'That image is too large (15 MB max).' } }

  // M15: the remote server's Content-Type is a claim, same as a browser's.
  // Store what the bytes actually are.
  const sniffed = sniffImageType(buf)
  if (!sniffed) return { error: 'That link is not a JPG, PNG, WebP or GIF.' }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const admin = createAdminClient()
  const ext = sniffed.slice(6).replace('jpeg', 'jpg')
  const path = `${workspace.siteId}/${crypto.randomUUID()}.${ext}`
  const { error } = await admin.storage.from('site-assets').upload(path, buf, { contentType: sniffed })
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

  // M4: gate and act on the SAME site. This used to check
  // getPrimarySite().isUnlocked and then publish the client-supplied `siteId`
  // — a paywall bypass for anyone able to reach an unlocked site and a locked
  // one. `siteId` is now only honoured when it is the caller's own workspace;
  // publishSnapshot re-checks the unlock against the site it is publishing.
  const workspace = await getPrimarySite()
  if (!workspace) return { error: 'No site.' }
  if (siteId !== workspace.siteId) return { error: 'That site is not open in your workspace.' }

  const { publishSnapshot } = await import('@/lib/publish')
  const res = await publishSnapshot(workspace.siteId)
  if ('error' in res && res.error) return res

  revalidatePath('/website')
  return { ok: true }
}
