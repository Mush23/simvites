'use client'

import { useRef, useState } from 'react'
import type { ImageSearchResult } from '@/app/api/image-search/route'

/**
 * The value an image field holds. Plain fields keep a string URL (all
 * existing data). Focal-enabled fields (Hero) hold { url, focal } where
 * focal is a CSS object-position like "32% 60%" — set by clicking the
 * preview. Renderers normalise both shapes.
 */
export type ImageValue = string | { url: string; focal?: string }

export function imageUrlOf(v: ImageValue | undefined | null): string {
  return typeof v === 'string' ? v : v?.url ?? ''
}
export function imageFocalOf(v: ImageValue | undefined | null): string | undefined {
  return typeof v === 'string' ? undefined : v?.focal
}

/**
 * Puck custom field: upload a photo, search free photos (imported into our
 * bucket, never hotlinked), and — when `focal` is on — click the preview to
 * choose which part of the photo stays in view.
 */
export function ImageFieldInput({ value, onChange, focal = false }: {
  value: ImageValue
  onChange: (v: ImageValue) => void
  focal?: boolean
}) {
  const url = imageUrlOf(value)
  const focalPos = imageFocalOf(value)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ImageSearchResult[] | null>(null)
  const previewRef = useRef<HTMLImageElement>(null)

  const emit = (nextUrl: string, nextFocal?: string) =>
    onChange(focal ? (nextUrl ? { url: nextUrl, focal: nextFocal } : '') : nextUrl)

  async function runSearch() {
    if (!query.trim()) return
    setBusy('search'); setErr(null)
    try {
      const r = await fetch(`/api/image-search?q=${encodeURIComponent(query)}`)
      const j = await r.json()
      if (j.error) setErr(j.error)
      setResults(j.results ?? [])
    } catch { setErr('Search failed — try again.') }
    setBusy(null)
  }

  async function pick(photo: ImageSearchResult) {
    setBusy(photo.full); setErr(null)
    const { importImageFromUrl } = await import('@/app/(app)/website/actions')
    const res = await importImageFromUrl(photo.full)
    setBusy(null)
    if (res.url) { emit(res.url); setSearching(false); setResults(null) }
    else setErr(res.error ?? 'Could not add that photo.')
  }

  return (
    <div>
      {url && (
        <div className="relative mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={previewRef} src={url} alt=""
            title={focal ? 'Click the most important part of the photo — it stays in view on every screen' : undefined}
            className={`h-24 w-full rounded-md border border-line object-cover ${focal ? 'cursor-crosshair' : ''}`}
            style={focalPos ? { objectPosition: focalPos } : undefined}
            onClick={(e) => {
              if (!focal || !previewRef.current) return
              const r = previewRef.current.getBoundingClientRect()
              if (r.width === 0 || r.height === 0) return
              const x = Math.round(((e.clientX - r.left) / r.width) * 100)
              const y = Math.round(((e.clientY - r.top) / r.height) * 100)
              emit(url, `${x}% ${y}%`)
            }} />
          {focal && (
            <span className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{
                left: (focalPos ?? '50% 50%').split(' ')[0],
                top: (focalPos ?? '50% 50%').split(' ')[1],
                background: 'var(--accent, #B4552D)',
              }} />
          )}
        </div>
      )}
      {focal && url && (
        <p className="mb-2 text-[10px]" style={{ color: 'var(--ink-3, #888)' }}>
          Click the photo to choose its focus point
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <label className={`cursor-pointer rounded-pill px-3 py-2 text-xs font-semibold text-white ${busy === 'upload' ? 'opacity-50' : ''}`}
          style={{ background: 'var(--accent, #B4552D)' }}>
          {busy === 'upload' ? 'Uploading…' : url ? 'Replace' : 'Upload photo'}
          <input type="file" accept="image/*" className="hidden" disabled={!!busy}
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setBusy('upload'); setErr(null)
              const { uploadSiteImage } = await import('@/app/(app)/website/actions')
              const fd = new FormData(); fd.set('file', f)
              const res = await uploadSiteImage(fd)
              setBusy(null)
              if (res.url) emit(res.url)
              else setErr(res.error ?? 'Upload failed')
              e.target.value = ''
            }} />
        </label>
        <button type="button" onClick={() => setSearching((s) => !s)}
          className="rounded-pill border px-3 py-2 text-xs" style={{ borderColor: 'var(--line, #ddd)' }}>
          {searching ? 'Close search' : 'Find a photo'}
        </button>
        {url && (
          <button type="button" onClick={() => emit('')}
            className="rounded-pill border px-3 py-2 text-xs" style={{ borderColor: 'var(--line, #ddd)' }}>
            Remove
          </button>
        )}
      </div>

      {searching && (
        <div className="mt-2 rounded-md border p-2" style={{ borderColor: 'var(--line, #ddd)' }}>
          <div className="flex gap-1.5">
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runSearch() } }}
              placeholder="e.g. marigold flowers, mandap…"
              className="min-w-0 flex-1 rounded-md border px-2 py-1.5 text-xs"
              style={{ borderColor: 'var(--line, #ddd)', background: 'var(--paper-2, #faf8f4)' }} />
            <button type="button" onClick={runSearch} disabled={!!busy}
              className="rounded-pill px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--accent, #B4552D)' }}>
              {busy === 'search' ? '…' : 'Search'}
            </button>
          </div>
          {results && (
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {results.length === 0 && <p className="col-span-3 text-[11px]" style={{ color: 'var(--ink-3, #888)' }}>No photos found — try different words.</p>}
              {results.map((p) => (
                <button key={p.full} type="button" onClick={() => pick(p)} disabled={!!busy}
                  title={`By ${p.credit} (${p.source}) — click to add`}
                  className={`relative aspect-[4/3] overflow-hidden rounded ${busy === p.full ? 'opacity-40' : ''}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumb} alt={p.credit} className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
          <p className="mt-1.5 text-[10px]" style={{ color: 'var(--ink-3, #888)' }}>
            Free photos. Picked photos are saved to your site.
          </p>
        </div>
      )}
      {err && <p className="mt-1 text-xs" style={{ color: '#7E3232' }}>{err}</p>}
    </div>
  )
}
