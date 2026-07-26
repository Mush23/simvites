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

              <div className="relative border-b border-line">
                {thumbs[i]}
                {/* Hover pair. Always reachable by keyboard via the buttons
                    below — this layer is a shortcut, not the only route. */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-ink/0 opacity-0 transition-all duration-200 group-hover:bg-ink/25 group-hover:opacity-100">
                  <button type="button" onClick={() => setOpen(pos)}
                    className="pointer-events-auto rounded-md bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink shadow-lift">
                    Preview
                  </button>
                  {onUse && !applied && (
                    <button type="button" onClick={() => onUse(t.id)}
                      className="pointer-events-auto rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-lift">
                      Use this
                    </button>
                  )}
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
                    <span className="rounded-pill bg-selected-soft px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.09em] text-selected">
                      In use
                    </span>
                  )}
                </div>
              </div>

              {/* Keyboard-reachable equivalents of the hover pair. */}
              <div className="flex items-center gap-2 px-3.5 pb-3.5">
                <button type="button" onClick={() => setOpen(pos)}
                  className="flex-1 rounded-md border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-line-2 hover:text-ink">
                  Preview
                </button>
                {onUse && (applied
                  ? <span className="flex-1 text-center text-[12px] text-ink-3">Applied</span>
                  : <button type="button" onClick={() => onUse(t.id)}
                      className="flex-1 rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-white">
                      Use this template
                    </button>
                )}
              </div>
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
