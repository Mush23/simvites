'use client'

import { useEffect, useState } from 'react'

// A simulated SCREEN RECORDING of the editor: a browser frame, a moving
// cursor, click pulses, live "typing" — showing exactly where to click and
// how to edit, with zero code. Always up to date, nothing to re-record.

const STEPS = [
  { title: 'Step 1: Meet your editor', help: 'This is your website in edit mode. No code, ever — if you can click and type, you can build this.' },
  { title: 'Step 2: Click any text to edit', help: 'Click straight on a heading or paragraph. It opens in the side panel, ready to change.' },
  { title: 'Step 3: Type, and watch it update', help: 'Type in the panel and the page updates instantly. What you see is exactly what guests get.' },
  { title: 'Step 4: Drag to reorder and resize', help: 'Grab a block to move it up or down. Sections size themselves for phones automatically.' },
  { title: 'Step 5: Add blocks from the library', help: 'Countdown, gallery, hotel card, RSVP — click one and it drops onto your page.' },
  { title: 'Step 6: Press Publish', help: 'Nothing goes live until you say so. One click and your site is out in the world.' },
] as const

const DUR = 4200
// cursor position per step (percent of stage)
const CURSOR: [number, number][] = [[50, 55], [46, 34], [82, 30], [46, 62], [12, 40], [88, 9]]

export function FlowPlayer() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), DUR)
    return () => clearInterval(id)
  }, [playing])

  const s = STEPS[step]
  const [cx, cy] = CURSOR[step]
  const typed = step >= 2 ? 'Aanya & Dev' : 'Your names'

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-line bg-paper-2 px-4 py-2.5">
        <span className="flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="h-2.5 w-2.5 rounded-pill bg-line-2" />)}</span>
        <span className="mx-auto rounded-pill bg-surface px-4 py-1 font-mono text-[10px] text-ink-3">yoursite.occasio.events — editing</span>
      </div>

      {/* Stage */}
      <div className="relative h-72 select-none bg-paper-2 sm:h-80" aria-live="polite">
        {/* Block library (left) */}
        <div className="absolute left-2 top-3 bottom-3 w-[18%] rounded-md border border-line bg-surface p-2">
          {['Hero', 'Countdown', 'Gallery', 'Hotel', 'RSVP'].map((b, i) => (
            <div key={b} title={`Add a ${b} block`}
              className={`mb-1.5 rounded-md border px-2 py-1.5 text-[10px] transition-all duration-500 ${step === 4 && i === 1 ? 'border-accent bg-accent-soft text-ink shadow-card' : 'border-line text-ink-3'}`}>
              {b}
            </div>
          ))}
        </div>

        {/* Canvas (middle) */}
        <div className="absolute left-[21%] right-[26%] top-3 bottom-3 overflow-hidden rounded-md border border-line bg-surface p-3">
          <div title="Click to edit this heading"
            className={`rounded-md px-2 py-2 text-center transition-all duration-500 ${step === 1 || step === 2 ? 'bg-accent-soft outline outline-2 outline-[var(--accent-line)]' : ''}`}>
            <p className="font-display text-xl text-ink">{typed}{step === 2 && <span className="animate-pulse text-accent-ink">|</span>}</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3">19 September 2026</p>
          </div>
          <div title="Drag to move this section"
            className={`mt-2 rounded-md border border-line p-2 transition-all duration-500 ${step === 3 ? '-translate-y-1 rotate-[0.6deg] shadow-lift outline outline-2 outline-[var(--accent-line)]' : ''}`}>
            <div className="h-2 w-24 rounded bg-line-2" /><div className="mt-1.5 h-2 w-32 rounded bg-line" />
          </div>
          <div className={`mt-2 grid grid-cols-3 gap-1.5 transition-all duration-700 ${step >= 4 ? 'opacity-100' : 'opacity-30'}`}>
            {[0, 1, 2].map((i) => <div key={i} className="h-9 rounded bg-line" />)}
          </div>
          {step === 5 && (
            <div className="absolute inset-x-8 top-1/3 rounded-md bg-ink px-3 py-2 text-center text-xs text-paper shadow-lift">
              Published — your site is live ✓
            </div>
          )}
        </div>

        {/* Side panel (right) */}
        <div className="absolute right-2 top-3 bottom-3 w-[23%] rounded-md border border-line bg-surface p-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">Hero</p>
          <p className="mt-2 text-[10px] text-ink-2">Title</p>
          <div title="Type here — the page updates live"
            className={`mt-1 rounded-md border px-2 py-1.5 text-[10px] text-ink transition-all duration-500 ${step === 2 ? 'border-accent bg-accent-soft' : 'border-line'}`}>
            {typed}
          </div>
          <div className="mt-3 rounded-pill bg-accent px-3 py-1.5 text-center text-[10px] font-semibold text-white" title="Publish your changes">
            Publish
          </div>
        </div>

        {/* The cursor */}
        <div className="pointer-events-none absolute z-10 transition-all duration-[900ms] ease-out"
          style={{ left: `${cx}%`, top: `${cy}%` }}>
          <svg width="20" height="20" viewBox="0 0 24 24" className="drop-shadow"><path d="M5 3l14 8-6 1.5L10.5 19 5 3z" fill="var(--ink)" stroke="var(--paper)" strokeWidth="1.5" /></svg>
          <span key={step} className="absolute -left-2 -top-2 h-9 w-9 animate-ping rounded-pill border-2 border-[var(--accent)] opacity-60" />
        </div>
      </div>

      {/* Caption + controls */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-xl text-ink">{s.title}</p>
            <p className="mt-1 text-sm text-ink-2">{s.help}</p>
          </div>
          <button type="button" onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause walkthrough' : 'Play walkthrough'}
            title={playing ? 'Pause' : 'Play'}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border border-line text-ink">
            {playing ? '❚❚' : '▶'}
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          {STEPS.map((_, i) => (
            <button key={i} type="button" onClick={() => { setStep(i); setPlaying(false) }}
              aria-label={`Jump to step ${i + 1}`} title={STEPS[i].title}
              className="h-1.5 flex-1 overflow-hidden rounded-pill bg-line">
              <span className="block h-full rounded-pill bg-accent"
                style={{ width: i < step ? '100%' : '0%',
                  animation: i === step && playing ? `flowbar ${DUR}ms linear forwards` : undefined }} />
            </button>
          ))}
        </div>
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
          Everything you just watched is zero code
        </p>
      </div>
      <style>{`@keyframes flowbar { from { width: 0 } to { width: 100% } }`}</style>
    </div>
  )
}
