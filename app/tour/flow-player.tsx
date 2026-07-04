'use client'

import { useEffect, useState } from 'react'

// The in-site "video": an auto-playing walkthrough of the whole flow, built
// as an animated component (no mp4 to host, always up to date, accessible).

const STEPS = [
  { title: '1 · Create your site', body: 'Pick a template, name your celebration — your website exists in under a minute.', mock: 'picker' },
  { title: '2 · Add your events', body: 'Mehndi, Sangeet, Ceremony, Reception — every celebration with its own date, venue and colour.', mock: 'events' },
  { title: '3 · Invite guests per event', body: 'Tick exactly who is invited to what. Uninvited events simply don’t exist for that guest.', mock: 'matrix' },
  { title: '4 · Send personal links', body: 'Each household gets one private link — by email or WhatsApp. No accounts, no passwords.', mock: 'link' },
  { title: '5 · Guests RSVP on their phone', body: 'They see only their events, tap Joyfully yes, answer your questions, get a keepsake PDF.', mock: 'phone' },
  { title: '6 · Watch it all land', body: 'Live counts per event, dietary roll-ups, who opened but hasn’t replied — and one CSV for the caterer.', mock: 'dash' },
] as const

const DUR = 3800

export function FlowPlayer() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), DUR)
    return () => clearInterval(id)
  }, [playing])

  const s = STEPS[step]

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      {/* Stage */}
      <div className="relative flex h-64 items-center justify-center bg-paper-2 sm:h-72" aria-live="polite">
        <Mock kind={s.mock} />
      </div>
      {/* Caption + controls */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-xl text-ink">{s.title}</p>
            <p className="mt-1 text-sm text-ink-2">{s.body}</p>
          </div>
          <button type="button" onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause walkthrough' : 'Play walkthrough'}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border border-line text-ink">
            {playing ? '❚❚' : '▶'}
          </button>
        </div>
        {/* Progress dots */}
        <div className="mt-4 flex gap-2">
          {STEPS.map((_, i) => (
            <button key={i} type="button" onClick={() => { setStep(i); setPlaying(false) }}
              aria-label={`Step ${i + 1}`}
              className="h-1.5 flex-1 overflow-hidden rounded-pill bg-line">
              <span className="block h-full rounded-pill bg-accent transition-all"
                style={{ width: i < step ? '100%' : i === step ? undefined : '0%',
                  animation: i === step && playing ? `flowbar ${DUR}ms linear forwards` : undefined,
                  ...(i === step && !playing ? { width: '50%' } : {}) }} />
            </button>
          ))}
        </div>
      </div>
      <style>{`@keyframes flowbar { from { width: 0 } to { width: 100% } }`}</style>
    </div>
  )
}

/** Tiny CSS illustrations — enough to *show*, not screenshots to maintain. */
function Mock({ kind }: { kind: string }) {
  const card = 'rounded-md border border-line bg-surface shadow-card'
  if (kind === 'picker') return (
    <div className="flex gap-4">
      <div className={`${card} h-36 w-28 p-2`}><div className="h-14 rounded bg-[#F5EFE3]" /><div className="mt-2 h-2 w-16 rounded bg-[#C9A227]" /><div className="mt-1 h-2 w-12 rounded bg-[#7A1F1F]" /></div>
      <div className={`${card} h-36 w-28 p-2 opacity-70`}><div className="h-14 rounded bg-[#F6F1E9]" /><div className="mt-2 h-2 w-16 rounded bg-[#211D18]" /><div className="mt-1 h-2 w-12 rounded bg-[#B08D57]" /></div>
    </div>
  )
  if (kind === 'events') return (
    <div className="w-64 space-y-2">
      {['#C9A227', '#3B5BA5', '#7A1F1F', '#2D3A66'].map((c, i) => (
        <div key={i} className={`${card} flex items-center gap-3 p-2.5`} style={{ borderLeft: `3px solid ${c}` }}>
          <div className="h-2 w-24 rounded bg-line-2" /><div className="ml-auto h-2 w-10 rounded bg-line" />
        </div>
      ))}
    </div>
  )
  if (kind === 'matrix') return (
    <div className={`${card} p-4`}>
      {[0, 1, 2].map((r) => (
        <div key={r} className="mb-2 flex items-center gap-3 last:mb-0">
          <div className="h-2 w-16 rounded bg-line-2" />
          {[0, 1, 2, 3].map((c) => (
            <div key={c} className={`h-4 w-4 rounded-sm border border-line ${(r + c) % 3 !== 0 ? 'bg-accent' : ''}`} />
          ))}
        </div>
      ))}
    </div>
  )
  if (kind === 'link') return (
    <div className={`${card} flex items-center gap-2 p-3`}>
      <div className="h-2 w-40 rounded bg-line-2" />
      <span className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white">Send</span>
    </div>
  )
  if (kind === 'phone') return (
    <div className="h-52 w-28 rounded-xl border-2 border-line-2 bg-surface p-2">
      <div className="mx-auto h-2 w-12 rounded bg-line" />
      <div className="mt-3 h-2 w-16 rounded bg-line-2" />
      {[0, 1].map((i) => (
        <div key={i} className="mt-2 flex gap-1">
          <span className="rounded-md bg-accent px-1.5 py-1 text-[8px] font-semibold text-white">Yes</span>
          <span className="rounded-md border border-line px-1.5 py-1 text-[8px] text-ink-3">No</span>
        </div>
      ))}
      <div className="mt-4 h-6 rounded-md bg-accent" />
    </div>
  )
  return (
    <div className="flex gap-3">
      {[['12', 'ok'], ['3', 'bad'], ['5', 'warn']].map(([n], i) => (
        <div key={i} className={`${card} w-20 p-3 text-center`}>
          <p className="font-display text-2xl text-ink">{n}</p>
          <div className="mx-auto mt-1 h-1.5 w-10 rounded bg-line" />
        </div>
      ))}
    </div>
  )
}
