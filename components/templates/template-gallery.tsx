'use client'

import { useMemo, useState } from 'react'
import { TAG_LABEL, TAG_ORDER, type TemplateManifest, type TemplateTag } from '@/lib/templates/manifest'
import { PreviewShell } from './preview-shell'

// Phase 3.4 — the gallery.
//
// Filter CHIPS, not a dropdown: with eighteen looks the filter is the primary
// way in, and hiding it behind a select costs a click to discover what the
// options even are.
//
// `thumbs` arrives as pre-rendered ReactNodes from the server page, so the real
// template component tree is server-rendered while the filtering, hover state
// and preview shell stay client-side. The thumbnails are never re-rendered by
// anything this component does.

export function TemplateGallery({
  templates,
  thumbs,
  appliedKey,
  onUse,
  seeded,
}: {
  templates: TemplateManifest[]
  thumbs: React.ReactNode[]
  appliedKey?: string
  /** Omitted on the marketing gallery, where there is no site to apply to. */
  onUse?: (key: string) => void
  seeded?: boolean
}) {
  const [tag, setTag] = useState<TemplateTag | 'all'>('all')
  const [open, setOpen] = useState<number | null>(null)

  // TAG_ORDER, not Object.keys — chip order is a deliberate broad-to-narrow
  // sequence, and object key order is too fragile a thing to hang it on.
  const tags = useMemo(() => {
    const present = new Set(templates.flatMap((t) => t.tags))
    return TAG_ORDER.filter((t) => present.has(t))
  }, [templates])

  // Filtering reindexes the set, and the shell's Prev/Next walks THIS list — so
  // browsing inside a filter stays inside the filter.
  const shown = useMemo(
    () => templates
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => tag === 'all' || t.tags.includes(tag)),
    [templates, tag],
  )
  const shownTemplates = shown.map(({ t }) => t)

  const chip = (active: boolean) =>
    `rounded-pill px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
      active ? 'bg-ink text-paper' : 'border border-line text-ink-2 hover:border-line-2 hover:text-ink'}`

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setTag('all')} className={chip(tag === 'all')}>
          All <span className="nums">{templates.length}</span>
        </button>
        {tags.map((t) => (
          <button key={t} type="button" onClick={() => setTag(tag === t ? 'all' : t)}
            className={chip(tag === t)}>
            {TAG_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map(({ t, i }, pos) => {
          const applied = t.id === appliedKey
          return (
            <div key={t.id}
              // content-visibility lets the browser skip layout and paint for
              // offscreen cards — the real fix for eighteen live renders on one
              // page. contain-intrinsic-size must match the card so scrollbar
              // length and layout stay stable: a gallery that shifts as you
              // scroll is the fastest way to look cheap.
              style={{ contentVisibility: 'auto', containIntrinsicSize: '380px 420px' }}
              className={`group relative overflow-hidden rounded-card border bg-surface shadow-card transition-colors ${
                applied ? 'border-selected-line' : 'border-line hover:border-line-2'}`}>

              {/* The whole card opens the preview. A stretched button rather
                  than wrapping the card in one, because a <button> may not
                  contain block content — this keeps valid markup while making
                  the card a single pointer and keyboard target.
                  Negative outline-offset so the focus ring is not clipped by
                  the card's own overflow-hidden. */}
              <button type="button" onClick={() => setOpen(pos)}
                aria-label={`Preview ${t.name}`}
                className="absolute inset-0 z-[2] cursor-pointer rounded-card focus-visible:[outline-offset:-3px]" />

              <div className="relative border-b border-line">
                {thumbs[i]}
                {/* Purely visual: the stretched button above owns the click and
                    the accessible name, so this must not be interactive. */}
                <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/0 transition-colors duration-200 group-hover:bg-ink/25">
                  <span className="rounded-md bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink opacity-0 shadow-lift transition-opacity duration-200 group-hover:opacity-100">
                    Preview
                  </span>
                </div>
              </div>

              <div className="flex items-start justify-between gap-2 p-3.5">
                <div className="min-w-0">
                  <p className="truncate font-display text-[15.5px] leading-tight text-ink">{t.name}</p>
                  <p className="text-[11.5px] text-ink-3">{t.tagline}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="flex gap-1" aria-hidden>
                    {t.swatches.map((c) => (
                      <span key={c} className="h-3 w-3 rounded-full border border-line" style={{ background: c }} />
                    ))}
                  </span>
                  {applied && (
                    <span className="rounded-pill bg-selected-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink">
                      In use
                    </span>
                  )}
                </div>
              </div>

              {/* No apply button here. Choosing a look off a 4:3 thumbnail is a
                  decision made on too little; the preview is where you can
                  actually see the thing, so that is where committing belongs —
                  the pattern Squarespace and Framer both use. It also takes
                  eighteen solid accents off one screen. */}
            </div>
          )
        })}
      </div>

      {shown.length === 0 && (
        <p className="rounded-card border border-dashed border-line bg-paper p-10 text-center text-[13.5px] text-ink-3">
          No templates carry that tag yet.
        </p>
      )}

      {open !== null && shownTemplates[open] && (
        <PreviewShell
          templates={shownTemplates}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          onUse={onUse}
          appliedKey={appliedKey}
          seeded={seeded}
        />
      )}
    </>
  )
}
