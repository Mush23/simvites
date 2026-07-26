'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Monitor, Tablet, Smartphone, X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { TemplateManifest } from '@/lib/templates/manifest'

// Phase 3.5 — the preview shell.
//
// A full-screen overlay, not a new tab: browsing eighteen looks means moving
// between them quickly, and a tab-per-template turns that into tab management.
// Prev/Next swap the iframe's src without unmounting the shell, which is what
// makes the browsing feel continuous.

const DEVICES = [
  { key: 'desktop', label: 'Desktop', width: 1280, icon: Monitor },
  { key: 'tablet', label: 'Tablet', width: 834, icon: Tablet },
  { key: 'phone', label: 'Phone', width: 390, icon: Smartphone },
] as const

type DeviceKey = (typeof DEVICES)[number]['key']

export function PreviewShell({
  templates,
  index,
  onIndex,
  onClose,
  onUse,
  appliedKey,
  seeded,
}: {
  templates: TemplateManifest[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
  onUse?: (key: string) => void
  appliedKey?: string
  /** Seed the frame with the couple's own wedding rather than the demo one. */
  seeded?: boolean
}) {
  const current = templates[index]
  const [device, setDevice] = useState<DeviceKey>('desktop')
  const [loaded, setLoaded] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const width = DEVICES.find((d) => d.key === device)!.width

  const go = useCallback((delta: number) => {
    const next = (index + delta + templates.length) % templates.length
    setLoaded(false)
    onIndex(next)
  }, [index, templates.length, onIndex])

  // Arrows move between templates, Escape closes. Bound on the document so it
  // works wherever focus sits inside the shell.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); return }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [go, onClose])

  // The page behind must not scroll while a full-screen overlay is open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Move focus in on open so the keyboard shortcuts have somewhere to land.
  useEffect(() => { closeRef.current?.focus() }, [])

  const src = useMemo(
    () => `/preview/${current.id}/frame${seeded ? '?seeded=1' : ''}`,
    [current.id, seeded],
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${current.name} preview`}
      className="fixed inset-0 z-[var(--z-modal)] flex flex-col bg-ink/70 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          // Trap Tab inside the shell.
          if (e.key !== 'Tab' || !panelRef.current) return
          const f = panelRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], iframe',
          )
          if (!f.length) return
          const first = f[0]
          const last = f[f.length - 1]
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        {/* Top bar */}
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
          <button ref={closeRef} type="button" onClick={onClose}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
            <X size={15} strokeWidth={1.7} aria-hidden />
            Close
          </button>

          <span className="font-display text-[16px] text-ink">{current.name}</span>
          {current.id === appliedKey && (
            <span className="rounded-pill bg-selected-soft px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.09em] text-selected">
              In use
            </span>
          )}

          {/* Device toggles — a state, so ink rather than the brand accent. */}
          <div className="ml-auto flex items-center gap-1 rounded-pill border border-line p-1">
            {DEVICES.map((d) => {
              const Icon = d.icon
              const on = device === d.key
              return (
                <button key={d.key} type="button" onClick={() => setDevice(d.key)}
                  aria-pressed={on} title={`${d.label} — ${d.width}px`}
                  className={`flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[12px] transition-colors ${
                    on ? 'bg-surface-2 font-semibold text-ink' : 'text-ink-3 hover:text-ink'}`}>
                  <Icon size={14} strokeWidth={1.7} aria-hidden />
                  <span className="hidden sm:inline">{d.label}</span>
                </button>
              )
            })}
          </div>

          {onUse && current.id !== appliedKey && (
            <button type="button" onClick={() => onUse(current.id)}
              className="rounded-md bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white">
              Use this template
            </button>
          )}
        </div>

        {/* Stage.
            The IFRAME owns the width, not a wrapper. That is what device
            toggles are for — media queries inside the frame key off the
            frame's own width — so the width belongs on the element being
            measured. The wrapper shrink-wraps it (w-fit) rather than being
            sized itself, which also keeps the two from disagreeing. */}
        <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-paper-2 p-4">
          <div className="relative h-full w-fit shrink-0 overflow-hidden rounded-[10px] border border-line bg-surface shadow-lift">
            {/* Skeleton fills the frame box, so the stage never collapses
                while a template loads. */}
            {!loaded && (
              <div aria-hidden className="absolute inset-0 z-[1] animate-pulse bg-surface-2" />
            )}
            <iframe
              key={src}
              src={src}
              title={`${current.name} preview`}
              onLoad={() => setLoaded(true)}
              width={width}
              style={{ width, maxWidth: '100%' }}
              className="block h-full border-0"
            />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-surface px-4 py-2.5">
          <button type="button" onClick={() => go(-1)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
            <ChevronLeft size={15} strokeWidth={1.7} aria-hidden />
            Prev
          </button>
          <p className="text-[12.5px] text-ink-3">
            {current.name} · <span className="nums">{index + 1}</span> of <span className="nums">{templates.length}</span>
          </p>
          <button type="button" onClick={() => go(1)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
            Next
            <ChevronRight size={15} strokeWidth={1.7} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
