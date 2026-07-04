'use client'

import { useEffect, useState } from 'react'

function parts(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now())
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1_000) % 60,
    done: diff === 0,
  }
}

/** Ticking countdown — ported from the wedding site. Renders zeros until mounted (no hydration drift). */
export function Countdown({ heading, dateISO }: { heading?: string; dateISO: string }) {
  const target = new Date(dateISO)
  const [t, setT] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, done: false })
  const [live, setLive] = useState(false)

  useEffect(() => {
    if (Number.isNaN(target.getTime())) return
    setT(parts(target)); setLive(true)
    const id = setInterval(() => setT(parts(target)), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateISO])

  if (Number.isNaN(target.getTime())) return null

  const cells = [
    { v: t.days, l: 'Days' }, { v: t.hours, l: 'Hours' },
    { v: t.minutes, l: 'Minutes' }, { v: t.seconds, l: 'Seconds' },
  ]

  return (
    <section className="border-y px-6 py-14 text-center" style={{ borderColor: 'var(--line)', background: 'var(--paper-2)' }}>
      {heading && (
        <p className="mb-7 font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--accent-ink)' }}>
          {heading}
        </p>
      )}
      <div className={`mx-auto flex max-w-md justify-center gap-6 sm:gap-10 ${live ? '' : 'opacity-60'}`} aria-live="off">
        {cells.map((c) => (
          <div key={c.l}>
            <p className="font-display text-4xl tabular-nums sm:text-5xl" style={{ color: 'var(--ink)' }}>
              {String(c.v).padStart(2, '0')}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--ink-3)' }}>{c.l}</p>
          </div>
        ))}
      </div>
      {t.done && live && (
        <p className="mt-6 font-display text-2xl" style={{ color: 'var(--ink)' }}>The day is here.</p>
      )}
    </section>
  )
}
