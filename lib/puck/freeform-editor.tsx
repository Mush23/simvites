'use client'

import { useRef, useState } from 'react'
import { useGetPuck } from '@puckeditor/core'
import {
  FreeItemView, WASH_CSS, freeItemStyle,
  type FreeItem, type FreeformProps,
} from '@/components/site/freeform'

// Editor-only freeform canvas (D5): drag an item to place it anywhere —
// corners included — and drag the corner dot to resize. Double-click text to
// type on the canvas. Positions are stored as percentages, so what you place
// here keeps its exact shape on every device. Commits on pointer-up with
// recordHistory so Undo works.

export function FreeformEditor({ id, ratio, wash, items }: FreeformProps & { id: string }) {
  const getPuck = useGetPuck()
  const canvasRef = useRef<HTMLElement | null>(null)
  const [live, setLive] = useState<FreeItem[] | null>(null)
  const drag = useRef<{ ix: number; mode: 'move' | 'resize'; startX: number; startY: number; orig: FreeItem } | null>(null)
  const shown = live ?? items ?? []

  function commit(next: FreeItem[]) {
    const { appState, dispatch } = getPuck()
    const content = appState.data.content.map((c) =>
      (c.props as { id?: string } | undefined)?.id === id
        ? { ...c, props: { ...(c.props as Record<string, unknown>), items: next } }
        : c,
    )
    dispatch({ type: 'setData', data: { ...appState.data, content }, recordHistory: true })
  }

  function onPointerDown(e: React.PointerEvent, ix: number, mode: 'move' | 'resize') {
    // Don't hijack the pointer while the couple is typing in this item.
    if ((e.target as HTMLElement).isContentEditable) return
    e.preventDefault()
    e.stopPropagation()
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* synthetic events */ }
    drag.current = { ix, mode, startX: e.clientX, startY: e.clientY, orig: shown[ix] }
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!d || !rect) return
    const dx = ((e.clientX - d.startX) / rect.width) * 100
    const dy = ((e.clientY - d.startY) / rect.height) * 100
    const next = [...shown]
    if (d.mode === 'move') {
      next[d.ix] = {
        ...d.orig,
        x: Math.round(Math.min(Math.max(d.orig.x + dx, 0), 100 - d.orig.w) * 2) / 2,
        y: Math.round(Math.min(Math.max(d.orig.y + dy, 0), 97) * 2) / 2,
      }
    } else {
      next[d.ix] = { ...d.orig, w: Math.round(Math.min(Math.max(d.orig.w + dx, 4), 100 - d.orig.x) * 2) / 2 }
    }
    setLive(next)
  }

  function onPointerUp() {
    if (drag.current && live) commit(live)
    drag.current = null
    setLive(null)
  }

  function editText(ix: number, textEl: HTMLElement) {
    textEl.contentEditable = 'plaintext-only'
    textEl.focus()
    const done = () => {
      textEl.contentEditable = 'false'
      const next = [...(items ?? [])]
      next[ix] = { ...next[ix], text: textEl.innerText }
      commit(next)
      textEl.removeEventListener('blur', done)
    }
    textEl.addEventListener('blur', done)
  }

  return (
    <section
      ref={(el) => { canvasRef.current = el }}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: ratio, containerType: 'inline-size', background: WASH_CSS[wash] ?? WASH_CSS.paper }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {shown.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-center text-sm opacity-50">
          Add text or photos in the side panel, then drag them anywhere — corners welcome.
        </p>
      )}
      {shown.map((item, ix) => (
        <div
          key={ix}
          style={{ ...freeItemStyle(item), cursor: 'grab', touchAction: 'none' }}
          className="group/free outline-1 outline-dashed outline-transparent hover:outline-[color:var(--accent-line)]"
          onPointerDown={(e) => onPointerDown(e, ix, 'move')}
          onDoubleClick={(e) => {
            if (item.kind !== 'image') editText(ix, e.currentTarget.firstElementChild as HTMLElement)
          }}
        >
          <FreeItemView item={item} />
          <span
            role="presentation"
            onPointerDown={(e) => onPointerDown(e, ix, 'resize')}
            className="absolute -bottom-1.5 -right-1.5 hidden h-3.5 w-3.5 cursor-nwse-resize rounded-full border border-white bg-[color:var(--accent)] group-hover/free:block"
          />
        </div>
      ))}
    </section>
  )
}
