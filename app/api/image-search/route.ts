import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export interface ImageSearchResult {
  thumb: string
  full: string
  credit: string
  source: string
}

/**
 * Photo search for the editor's image fields (signed-in hosts only).
 * Uses Unsplash when UNSPLASH_ACCESS_KEY is set; otherwise falls back to
 * Openverse (keyless, CC-licensed). Picked photos are IMPORTED into the
 * site-assets bucket by importImageFromUrl — never hotlinked — so they
 * keep working and satisfy next/image's host allowlist.
 */
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  if (!rateLimit(`imgsearch:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many searches — give it a minute.' }, { status: 429 })
  }

  const q = new URL(req.url).searchParams.get('q')?.trim().slice(0, 80)
  if (!q) return NextResponse.json({ results: [] })

  try {
    const key = process.env.UNSPLASH_ACCESS_KEY
    let results: ImageSearchResult[]
    if (key) {
      const r = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=12&orientation=landscape&content_filter=high`,
        { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(10_000) },
      )
      if (!r.ok) throw new Error(`Unsplash ${r.status}`)
      const j = (await r.json()) as { results: { urls: { small: string; regular: string }; user?: { name?: string } }[] }
      results = j.results.map((p) => ({
        thumb: p.urls.small, full: p.urls.regular, credit: p.user?.name ?? 'Unsplash', source: 'Unsplash',
      }))
    } else {
      const r = await fetch(
        `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=12&license_type=commercial&mature=false`,
        { headers: { 'User-Agent': 'Simvites/1.0 (event website builder)' }, signal: AbortSignal.timeout(10_000) },
      )
      if (!r.ok) throw new Error(`Openverse ${r.status}`)
      const j = (await r.json()) as { results: { thumbnail?: string; url: string; creator?: string; source?: string }[] }
      results = j.results
        .filter((p) => p.url)
        .map((p) => ({
          thumb: p.thumbnail ?? p.url, full: p.url, credit: p.creator ?? 'Unknown', source: p.source ?? 'Openverse',
        }))
    }
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ error: 'Photo search is unavailable right now — try an upload instead.' }, { status: 502 })
  }
}
