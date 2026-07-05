'use client'

// ═══════════════════════════════════════════════════════════════════════
// LiveDemo — the 22-second seamless editor loop from the design handoff.
// A scripted timeline (no captions): drift → select hero → type the names →
// add Gallery → drag Countdown → gold accent → phone preview → Publish →
// toast → veil → loop. Direct DOM writes from one rAF for 60fps; React
// renders the structure once. `active` gates all work (perf note: skip
// writes when the frame is offscreen/faded).
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react'

const LOOP = 22 // seconds
const NAMES = 'Aanya & Dev'

const CHAPTERS = [
  { at: 0, label: 'Edit anything' },
  { at: 0.24, label: 'Add & arrange' },
  { at: 0.48, label: 'Style & preview' },
  { at: 0.7, label: 'Publish' },
]

/** Cursor waypoints: [time, x%, y%] within the frame. */
const CURSOR: [number, number, number][] = [
  [0.0, 82, 88], [1.55, 46, 30], [3.0, 84, 26], [6.0, 12, 52], [6.45, 12, 52],
  [7.6, 46, 44], [8.3, 46, 44], [10.6, 46, 62], [11.4, 88, 34], [11.95, 88, 34],
  [12.9, 66, 8], [13.35, 66, 8], [15.9, 92, 8], [16.9, 92, 8], [18.4, 96, 96], [22, 96, 96],
]

const ease = (a: number) => a < 0.5 ? 2 * a * a : 1 - Math.pow(-2 * a + 2, 2) / 2

function cursorAt(t: number): [number, number] {
  for (let i = 0; i < CURSOR.length - 1; i++) {
    const [t0, x0, y0] = CURSOR[i]
    const [t1, x1, y1] = CURSOR[i + 1]
    if (t >= t0 && t <= t1) {
      const a = t1 === t0 ? 1 : ease((t - t0) / (t1 - t0))
      // slight arc so drifts feel hand-driven
      const arc = Math.sin(a * Math.PI) * 3
      return [x0 + (x1 - x0) * a, y0 + (y1 - y0) * a - arc]
    }
  }
  return [CURSOR[0][1], CURSOR[0][2]]
}

export function LiveDemo({ active = true, showScrubber = true, className = '' }: {
  /** When false, the rAF makes no DOM writes (offscreen / faded). */
  active?: boolean
  showScrubber?: boolean
  className?: string
}) {
  const root = useRef<HTMLDivElement>(null)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const el = root.current
    if (!el) return
    const $ = (sel: string) => el.querySelector(sel) as HTMLElement | null
    const q = {
      cursor: $('[data-d=cursor]'), ripple: $('[data-d=ripple]'),
      heroBlock: $('[data-d=hero]'), heroTitle: $('[data-d=herotitle]'),
      inspName: $('[data-d=inspname]'), caret: $('[data-d=caret]'), inspPanel: $('[data-d=insp]'),
      gallery: $('[data-d=gallery]'), countdown: $('[data-d=countdown]'),
      canvas: $('[data-d=canvas]'), frameInner: $('[data-d=inner]'),
      publish: $('[data-d=publish]'), toast: $('[data-d=toast]'), url: $('[data-d=url]'),
      veil: $('[data-d=veil]'), libGallery: $('[data-d=libgallery]'), goldSwatch: $('[data-d=gold]'),
      devicePhone: $('[data-d=devphone]'), deviceDesk: $('[data-d=devdesk]'),
      bar: $('[data-d=bar]'), chapter: $('[data-d=chapter]'), clock: $('[data-d=clock]'),
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const start = performance.now()

    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      if (!activeRef.current) return
      const t = reduced ? 4.5 : ((now - start) / 1000) % LOOP

      // cursor + click ping
      const [cx, cy] = cursorAt(t)
      if (q.cursor) q.cursor.style.transform = `translate(${cx}%, ${cy}%) scale(${
        [1.55, 6.45, 11.95, 13.35, 16.9].some((c) => t > c && t < c + 0.18) ? 0.82 : 1})`
      const clickTimes = [1.55, 6.45, 8.3, 11.95, 13.35, 15.35, 16.9]
      const near = clickTimes.find((c) => t >= c && t < c + 0.45)
      if (q.ripple) {
        if (near != null) {
          const a = (t - near) / 0.45
          q.ripple.style.opacity = String(1 - a)
          q.ripple.style.transform = `translate(${cx}%, ${cy}%) scale(${0.4 + a * 1.6})`
        } else q.ripple.style.opacity = '0'
      }

      // hero selected 1.55 → until publish
      const sel = t >= 1.55 && t < 16.9
      if (q.heroBlock) q.heroBlock.style.outline = sel ? '2px solid oklch(0.62 0.21 29)' : '2px solid transparent'
      if (q.inspPanel) q.inspPanel.style.opacity = sel ? '1' : '0.45'

      // typing 1.9–5.4
      const chars = t < 1.9 ? (t < 1.55 ? NAMES.length : 0) : t < 5.4 ? Math.min(NAMES.length, Math.floor(((t - 1.9) / 3.5) * NAMES.length)) : NAMES.length
      const typed = t < 1.55 ? 'Your names' : NAMES.slice(0, chars) || ' '
      if (q.heroTitle && q.heroTitle.textContent !== typed) q.heroTitle.textContent = typed
      if (q.inspName && q.inspName.textContent !== typed) q.inspName.textContent = typed
      if (q.caret) q.caret.style.opacity = t > 1.55 && t < 5.6 && Math.floor(t * 2.6) % 2 === 0 ? '1' : '0'

      // gallery slides in at 6.45
      if (q.gallery) {
        const a = t < 6.45 ? 0 : Math.min(1, (t - 6.45) / 0.4)
        q.gallery.style.opacity = String(a)
        q.gallery.style.transform = `translateY(${14 * (1 - a)}px)`
        q.gallery.style.maxHeight = a > 0 ? '60px' : '0px'
        q.gallery.style.marginTop = a > 0 ? '6px' : '0px'
      }
      if (q.libGallery) q.libGallery.style.background = t >= 6.3 && t < 7 ? 'oklch(0.62 0.21 29 / 0.14)' : 'transparent'

      // drag countdown 8.3–10.6 (lift, travel one slot down, settle)
      if (q.countdown) {
        if (t >= 8.3 && t < 10.6) {
          const a = ease(Math.min(1, (t - 8.3) / 2.3))
          q.countdown.style.transform = `translateY(${a * 66}px) rotate(1.6deg) scale(1.02)`
          q.countdown.style.boxShadow = '0 14px 30px -12px rgba(0,0,0,.35)'
          q.countdown.style.zIndex = '3'
        } else if (t >= 10.6 && t < 21) {
          q.countdown.style.transform = 'translateY(66px)'
          q.countdown.style.boxShadow = 'none'
        } else {
          q.countdown.style.transform = 'none'
          q.countdown.style.boxShadow = 'none'
        }
      }
      if (q.gallery && t >= 8.3 && t < 21) {
        const a = t < 10.6 ? ease(Math.min(1, (t - 8.3) / 2.3)) : 1
        q.gallery.style.translate = `0 ${-a * 66}px`
      } else if (q.gallery) q.gallery.style.translate = '0 0'

      // gold accent at 11.95
      const gold = t >= 11.95 && t < 21
      if (q.heroBlock) {
        q.heroBlock.style.background = gold ? 'linear-gradient(140deg, #2b2313, #4a3a14)' : 'linear-gradient(140deg, #26202c, #3a2c3f)'
      }
      if (q.goldSwatch) q.goldSwatch.style.outline = gold ? '2px solid oklch(0.62 0.21 29)' : '1px solid rgba(255,255,255,.2)'

      // phone preview 13.35–15.35
      const phone = t >= 13.35 && t < 15.35
      if (q.canvas) {
        q.canvas.style.width = phone ? '46%' : '100%'
        q.canvas.style.margin = phone ? '0 auto' : '0'
      }
      if (q.devicePhone) q.devicePhone.style.background = phone ? 'rgba(255,255,255,.16)' : 'transparent'
      if (q.deviceDesk) q.deviceDesk.style.background = phone ? 'transparent' : 'rgba(255,255,255,.16)'

      // publish 16.9 → publishing → live 18.0
      if (q.publish) {
        const label = t < 16.9 || t >= 21.5 ? 'Publish' : t < 18 ? 'Publishing…' : 'Published ✓'
        if (q.publish.textContent !== label) q.publish.textContent = label
        q.publish.style.background = label === 'Published ✓' ? '#1B9E5F' : 'oklch(0.62 0.21 29)'
      }
      if (q.toast) {
        const on = t >= 18 && t < 20.6
        q.toast.style.opacity = on ? '1' : '0'
        q.toast.style.transform = on ? 'translateY(0)' : 'translateY(12px)'
      }
      if (q.url) {
        const live = t >= 18 && t < 21.5
        const label = live ? 'aanya-and-dev.simvites.co.uk · live ●' : 'aanya-and-dev.simvites.co.uk · editing'
        if (q.url.textContent !== label) q.url.textContent = label
        q.url.style.color = live ? '#3DD68C' : 'rgba(255,255,255,.55)'
      }

      // veil crossfade 21–22
      if (q.veil) q.veil.style.opacity = t >= 21 ? String((t - 21) / 1) : '0'

      // scrubber
      if (q.bar) q.bar.style.width = `${(t / LOOP) * 100}%`
      if (q.chapter) {
        const ch = [...CHAPTERS].reverse().find((c) => t / LOOP >= c.at)!
        if (q.chapter.textContent !== ch.label) q.chapter.textContent = ch.label
      }
      if (q.clock) {
        const s = Math.floor(t)
        const label = `0:${String(s).padStart(2, '0')}`
        if (q.clock.textContent !== label) q.clock.textContent = label
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div ref={root} className={className}>
      {/* Browser chrome */}
      <div className="overflow-hidden rounded-[13px] border border-white/[0.13] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.6)]"
        style={{ background: 'oklch(0.19 0.005 270)' }}>
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
          <span className="flex gap-1.5">
            <i className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><i className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><i className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          </span>
          <span data-d="url" className="flex-1 truncate rounded-md bg-white/[0.07] px-3 py-1 text-center font-mono text-[10px] text-white/55">
            aanya-and-dev.simvites.co.uk · editing
          </span>
          <span className="hidden gap-0.5 rounded-md border border-white/15 p-0.5 text-[9.5px] text-white/70 sm:flex">
            <i data-d="devdesk" className="rounded px-1.5 py-0.5 not-italic" style={{ background: 'rgba(255,255,255,.16)' }}>Desktop</i>
            <i data-d="devphone" className="rounded px-1.5 py-0.5 not-italic">Phone</i>
          </span>
          <span data-d="publish" className="rounded-md px-3 py-1 text-[10.5px] font-semibold text-white"
            style={{ background: 'oklch(0.62 0.21 29)' }}>Publish</span>
        </div>

        {/* Editor body */}
        <div className="relative flex text-left" style={{ minHeight: 320 }}>
          {/* Block library */}
          <div className="hidden w-[120px] shrink-0 border-r border-white/10 p-2.5 sm:block">
            <p className="mb-1.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-white/40">Blocks</p>
            {['Hero', 'Countdown', 'Schedule', 'Gallery', 'RSVP', 'Hotels'].map((b) => (
              <p key={b} data-d={b === 'Gallery' ? 'libgallery' : undefined}
                className="mb-0.5 rounded-md px-2 py-1 text-[10.5px] text-white/75">
                <span className="mr-1.5 text-white/30">⠿</span>{b}
              </p>
            ))}
          </div>

          {/* Canvas */}
          <div className="min-w-0 flex-1 p-3">
            <div data-d="canvas" className="space-y-1.5 transition-all duration-500" style={{ width: '100%' }}>
              <div data-d="hero" className="rounded-md px-3 py-4 text-center transition-colors duration-300"
                style={{ background: 'linear-gradient(140deg, #26202c, #3a2c3f)', outline: '2px solid transparent', outlineOffset: 2 }}>
                <p data-d="herotitle" className="font-display text-[19px] leading-tight text-[#F4ECDD]">Your names</p>
                <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-[#F4ECDD]/60">19 September 2026 · Jaipur</p>
              </div>
              <div className="relative">
                <div data-d="countdown" className="relative rounded-md bg-white/[0.06] px-3 py-2 transition-none">
                  <p className="flex justify-center gap-2 font-mono text-[9px] text-white/80">
                    {[['76', 'days'], ['08', 'hrs'], ['21', 'min'], ['54', 'sec']].map(([n, u]) => (
                      <span key={u}><b className="text-white">{n}</b> {u}</span>
                    ))}
                  </p>
                </div>
                <div data-d="gallery" className="overflow-hidden rounded-md bg-white/[0.06] px-3 py-2 opacity-0" style={{ maxHeight: 0 }}>
                  <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.14em] text-white/45">Gallery</p>
                  <div className="flex gap-1">
                    {['#C9A227', '#7A1F1F', '#3E7C4F', '#6D3FA9'].map((c) => (
                      <span key={c} className="h-5 flex-1 rounded-sm opacity-70" style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="rounded-md bg-white/[0.06] px-3 py-2">
                {[['#3E7C4F', 'Mehndi', 'Thu 17 · 4pm'], ['#6D3FA9', 'Sangeet', 'Fri 18 · 7pm'], ['#C9A227', 'Ceremony', 'Sat 19 · 11am']].map(([c, n, d]) => (
                  <p key={n} className="flex items-center gap-1.5 py-0.5 text-[9.5px] text-white/75">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{n}
                    <span className="ml-auto font-mono text-[8.5px] text-white/45">{d}</span>
                  </p>
                ))}
              </div>
              <div className="rounded-md px-3 py-2 text-center" style={{ background: 'rgba(122,31,31,.45)' }}>
                <p className="text-[10px] font-medium text-white/90">Will you join us? <span className="ml-1 rounded-sm bg-white/90 px-1.5 py-0.5 text-[8.5px] font-semibold text-[#7A1F1F]">RSVP now</span></p>
              </div>
            </div>
          </div>

          {/* Inspector */}
          <div data-d="insp" className="hidden w-[132px] shrink-0 border-l border-white/10 p-2.5 transition-opacity sm:block" style={{ opacity: 0.45 }}>
            <p className="mb-1.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-white/40">Hero</p>
            <p className="text-[9px] text-white/55">Names</p>
            <p className="mt-0.5 rounded-md border border-white/15 bg-white/[0.06] px-2 py-1 text-[10px] text-white">
              <span data-d="inspname">Your names</span><span data-d="caret" className="opacity-0">|</span>
            </p>
            <p className="mt-2 text-[9px] text-white/55">Date</p>
            <p className="mt-0.5 rounded-md border border-white/15 bg-white/[0.06] px-2 py-1 text-[10px] text-white/85">19 Sep 2026</p>
            <p className="mt-2 text-[9px] text-white/55">Accent</p>
            <p className="mt-1 flex gap-1.5">
              {['#7A1F1F', '#C9A227', '#3E7C4F', '#6D3FA9'].map((c, i) => (
                <span key={c} data-d={i === 1 ? 'gold' : undefined}
                  className="h-4 w-4 rounded-full" style={{ background: c, outline: '1px solid rgba(255,255,255,.2)', outlineOffset: 1 }} />
              ))}
            </p>
            <p className="mt-3 font-mono text-[8px] text-white/35">Autosaved · just now</p>
          </div>

          {/* toast */}
          <div data-d="toast"
            className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-2 rounded-lg border border-white/10 bg-[#17171A] px-3 py-2 text-[10.5px] text-white opacity-0 transition-all duration-300">
            <span className="flex h-4 w-4 items-center justify-center rounded bg-[rgba(61,214,140,.16)] text-[9px] text-[#3DD68C]">✓</span>
            Your site is live
          </div>

          {/* cursor + ripple + veil */}
          <div className="pointer-events-none absolute inset-0">
            <span data-d="ripple" className="absolute left-0 top-0 h-8 w-8 rounded-full opacity-0"
              style={{ border: '2px solid oklch(0.62 0.21 29)', marginLeft: -14, marginTop: -14 }} />
            <svg data-d="cursor" className="absolute left-0 top-0 h-[22px] w-[22px]"
              viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.5))', willChange: 'transform' }}>
              <path d="M5 3l14 8-6.5 1.5L9 19z" fill="#fff" stroke="#111" strokeWidth="1.2" />
            </svg>
            <div data-d="veil" className="absolute inset-0 bg-white opacity-0" />
          </div>
        </div>
      </div>

      {showScrubber && (
        <div className="mx-auto mt-4 flex max-w-[520px] items-center gap-3 px-2">
          <span className="flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'oklch(0.68 0.19 30)' }}>
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: 'oklch(0.68 0.19 30)' }} />
            Live demo
          </span>
          <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/15">
            <span data-d="bar" className="absolute left-0 top-0 h-full rounded-full" style={{ background: 'oklch(0.68 0.19 30)', width: 0 }} />
            {[24, 48, 70].map((p) => <span key={p} className="absolute top-0 h-full w-px bg-white/30" style={{ left: `${p}%` }} />)}
          </span>
          <span data-d="chapter" className="w-[104px] text-right text-[10.5px] text-white/70">Edit anything</span>
          <span data-d="clock" className="font-mono text-[9.5px] text-white/45">0:00</span>
        </div>
      )}
    </div>
  )
}
