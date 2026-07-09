'use client'

import { useEffect, useRef, useState } from 'react'
import { useGetPuck } from '@puckeditor/core'
import {
  FreeItemView, WASH_CSS, freeItemStyle,
  type FreeItem, type FreeformProps,
} from '@/components/site/freeform'

// Editor-only freeform canvas (D5): drag an item to place it anywhere —
// corners included — drag the corner dot to resize, double-click text to
// type on the canvas. Positions are stored as percentages, so what you place
// here keeps its exact shape on every device.
//
// WHY GEOMETRIC HIT-TESTING: Puck's canvas covers every block with an
// overlay (selection/reorder), and the freeform section's container-type
// creates a contained stacking context, so items can never sit above that
// overlay — real pointer events simply don't reach them. Instead, a
// document-level CAPTURE-phase listener (runs before Puck's dnd-kit
// activators) hit-tests the pointer against item rects; on a hit it claims
// the gesture. Pointers that miss items fall through to Puck untouched, so
// block selection and reordering keep working.

const RESIZE_ZONE = 18 // px square at an item's bottom-right corner

export function FreeformEditor({ id, ratio, wash, items }: FreeformProps & { id: string }) {
  const getPuck = useGetPuck()
  const canvasRef = useRef<HTMLElement | null>(null)
  const [live, setLive] = useState<FreeItem[] | null>(null)
  const drag = useRef<{ ix: number; mode: 'move' | 'resize'; startX: number; startY: number; orig: FreeItem } | null>(null)
  const shown = live ?? items ?? []

  // Listeners live outside React's lifecycle; refs keep their data current.
  const shownRef = useRef(shown); shownRef.current = shown
  const itemsRef = useRef(items); itemsRef.current = items
  // The in-flight drag result. A plain ref, updated SYNCHRONOUSLY in onMove:
  // state (setLive) only reaches refs after a re-render, so a fast drag whose
  // down/move/up land in one frame would otherwise commit nothing.
  const pending = useRef<FreeItem[] | null>(null)

  function commit(next: FreeItem[]) {
    const { appState, dispatch } = getPuck()
    const content = appState.data.content.map((c) =>
      (c.props as { id?: string } | undefined)?.id === id
        ? { ...c, props: { ...(c.props as Record<string, unknown>), items: next } }
        : c,
    )
    dispatch({ type: 'setData', data: { ...appState.data, content }, recordHistory: true })
  }
  const commitRef = useRef(commit); commitRef.current = commit

  useEffect(() => {
    function hitTest(x: number, y: number): { ix: number; el: HTMLElement; resize: boolean } | null {
      const canvas = canvasRef.current
      if (!canvas) return null
      const els = [...canvas.querySelectorAll<HTMLElement>('[data-free-ix]')]
      // Later items paint on top — test them first.
      for (const el of els.reverse()) {
        const r = el.getBoundingClientRect()
        const inItem = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
        if (!inItem) continue
        const resize = x >= r.right - RESIZE_ZONE && y >= r.bottom - RESIZE_ZONE
        return { ix: Number(el.dataset.freeIx), el, resize }
      }
      return null
    }

    function onDown(e: PointerEvent) {
      if ((e.target as HTMLElement).isContentEditable) return
      const hit = hitTest(e.clientX, e.clientY)
      if (!hit) return // not on an item: Puck handles it (select / reorder)
      e.stopPropagation()
      e.preventDefault()
      drag.current = {
        ix: hit.ix,
        mode: hit.resize ? 'resize' : 'move',
        startX: e.clientX,
        startY: e.clientY,
        orig: shownRef.current[hit.ix],
      }
    }

    function onMove(e: PointerEvent) {
      const d = drag.current
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!d || !rect || !d.orig) return
      const dx = ((e.clientX - d.startX) / rect.width) * 100
      const dy = ((e.clientY - d.startY) / rect.height) * 100
      const next = [...shownRef.current]
      if (d.mode === 'move') {
        next[d.ix] = {
          ...d.orig,
          x: Math.round(Math.min(Math.max(d.orig.x + dx, 0), 100 - d.orig.w) * 2) / 2,
          y: Math.round(Math.min(Math.max(d.orig.y + dy, 0), 97) * 2) / 2,
        }
      } else {
        next[d.ix] = { ...d.orig, w: Math.round(Math.min(Math.max(d.orig.w + dx, 4), 100 - d.orig.x) * 2) / 2 }
      }
      pending.current = next
      setLive(next)
    }

    function onUp() {
      if (drag.current && pending.current) commitRef.current(pending.current)
      drag.current = null
      pending.current = null
      setLive(null)
    }

    function onDblClick(e: MouseEvent) {
      const hit = hitTest(e.clientX, e.clientY)
      if (!hit) return
      const item = itemsRef.current?.[hit.ix]
      if (!item || item.kind === 'image') return
      e.stopPropagation()
      e.preventDefault()
      const textEl = hit.el.firstElementChild as HTMLElement | null
      if (!textEl) return
      textEl.contentEditable = 'plaintext-only'
      textEl.focus()
      const done = () => {
        textEl.contentEditable = 'false'
        const next = [...(itemsRef.current ?? [])]
        next[hit.ix] = { ...next[hit.ix], text: textEl.innerText }
        commitRef.current(next)
        textEl.removeEventListener('blur', done)
      }
      textEl.addEventListener('blur', done)
    }

    document.addEventListener('pointerdown', onDown, { capture: true })
    document.addEventListener('pointermove', onMove, { capture: true })
    document.addEventListener('pointerup', onUp, { capture: true })
    document.addEventListener('dblclick', onDblClick, { capture: true })
    return () => {
      document.removeEventListener('pointerdown', onDown, { capture: true })
      document.removeEventListener('pointermove', onMove, { capture: true })
      document.removeEventListener('pointerup', onUp, { capture: true })
      document.removeEventListener('dblclick', onDblClick, { capture: true })
    }
  }, [])

  return (
    <section
      ref={(el) => { canvasRef.current = el }}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: ratio, containerType: 'inline-size', background: WASH_CSS[wash] ?? WASH_CSS.paper }}
    >
      {shown.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-center text-sm opacity-50">
          Add text or photos in the side panel, then drag them anywhere — corners welcome.
        </p>
      )}
      {shown.map((item, ix) => (
        <div
          key={ix}
          data-free-ix={ix}
          style={{ ...freeItemStyle(item), cursor: 'grab', touchAction: 'none' }}
          className="outline-1 outline-dashed outline-[color:color-mix(in_oklab,var(--accent-line)_55%,transparent)]"
        >
          <FreeItemView item={item} />
          {/* Always-visible resize dot: hover states can't fire under Puck's
              overlay, and couples should see the affordance anyway. */}
          <span
            role="presentation"
            data-free-handle
            className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full border border-white bg-[color:var(--accent)]"
          />
        </div>
      ))}
    </section>
  )
}
