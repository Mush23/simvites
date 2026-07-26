'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'

export interface GalleryImage { url: string; caption?: string }

/** Masonry-ish gallery with a keyboard-accessible lightbox (ported behaviour). */
export function Gallery({ heading, images }: { heading?: string; images: GalleryImage[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const valid = images.filter((i) => i.url)

  const close = useCallback(() => setOpen(null), [])
  const step = useCallback((d: number) => {
    setOpen((o) => (o === null ? null : (o + d + valid.length) % valid.length))
  }, [valid.length])

  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close, step])

  if (!valid.length) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        {heading && <h2 className="font-display text-4xl" style={{ color: 'var(--ink)' }}>{heading}</h2>}
        <p className="mt-4 text-sm" style={{ color: 'var(--ink-3)' }}>Photos will appear here.</p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      {heading && <h2 className="mb-10 text-center font-display text-4xl" style={{ color: 'var(--ink)' }}>{heading}</h2>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {valid.map((img, i) => (
          <button key={i} type="button" onClick={() => setOpen(i)}
            className="group relative aspect-[4/5] overflow-hidden rounded-lg focus-visible:outline-2"
            aria-label={img.caption || `Photo ${i + 1}`}>
            <Image src={img.url} alt={img.caption ?? ''} fill sizes="(max-width:640px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
          </button>
        ))}
      </div>

      {open !== null && (
        <div role="dialog" aria-modal="true" aria-label="Photo viewer"
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/85 p-6" onClick={close}>
          <div className="relative max-h-[85vh] w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-[4/3] w-full">
              <Image src={valid[open].url} alt={valid[open].caption ?? ''} fill sizes="90vw" className="object-contain" />
            </div>
            {valid[open].caption && <p className="mt-3 text-center text-sm text-white/85">{valid[open].caption}</p>}
            <div className="mt-4 flex items-center justify-center gap-6 text-white/90">
              <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="min-h-11 px-3 text-xl">←</button>
              <span className="font-mono text-xs">{open + 1} / {valid.length}</span>
              <button type="button" onClick={() => step(1)} aria-label="Next photo" className="min-h-11 px-3 text-xl">→</button>
              <button type="button" onClick={close} aria-label="Close viewer" className="min-h-11 px-3 text-xl">✕</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
