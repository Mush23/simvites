'use client'

import { useEffect, useRef, useState } from 'react'

// Scales a desktop-width render down into a thumbnail box.
//
// The children are SERVER-rendered (see TemplateRender, which uses Puck's RSC
// Render), so this wrapper deliberately does nothing but measure and transform.
// It never re-renders the tree it is given.
//
// Why a ResizeObserver rather than pure CSS: the scale factor is
// containerWidth / designWidth, and expressing that in CSS needs a
// length-divided-by-length calc() with container query units, which is not
// reliably supported. Twenty lines of measurement is the honest trade.
//
// NOTE on the build plan: it specified IntersectionObserver lazy-mounting here.
// That cannot help when the markup arrives server-rendered — the DOM already
// exists by the time any observer runs. The two things that DO cut the cost are
// applied instead: the document is truncated to its first blocks (see
// thumbDoc), and each card carries `content-visibility: auto`, which is the
// browser-native version of exactly what the lazy-mount was approximating —
// offscreen cards skip layout, style and paint entirely, with no JS at all.

export function ScaleToFit({
  designWidth = 1280,
  ratio = 4 / 3,
  children,
}: {
  designWidth?: number
  /** width / height of the thumbnail box. */
  ratio?: number
  children: React.ReactNode
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  // 0 until measured, so the render never flashes at full size first.
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = (w: number) => setScale(w > 0 ? w / designWidth : 0)
    measure(el.getBoundingClientRect().width)
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) measure(e.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [designWidth])

  const designHeight = Math.round(designWidth / ratio)

  return (
    <div ref={boxRef} className="relative w-full overflow-hidden"
      style={{ aspectRatio: String(ratio) }}>
      <div
        aria-hidden
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: designWidth,
          height: designHeight,
          transform: `scale(${scale})`,
          // Hidden until measured — a 1280px-wide page briefly painted inside a
          // 380px card is a worse first impression than an extra frame of blank.
          visibility: scale ? 'visible' : 'hidden',
          // The thumbnail is decoration; the card's own link is the control.
          pointerEvents: 'none',
        }}>
        {children}
      </div>
    </div>
  )
}
