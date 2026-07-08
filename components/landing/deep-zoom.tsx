'use client'

// ═══════════════════════════════════════════════════════════════════════
// DeepZoom — scenes 1–4 of the overhaul landing: hero → the dive (sticky
// 560vh stage where the LiveDemo frame scales in over a near-black field)
// → module tunnel (4 window cards fly past camera) → ivory portal into the
// wedding dimension. One rAF; transform/opacity only; static under
// prefers-reduced-motion.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'
import { LiveDemo } from './live-demo'

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
/** 0→1 across [a,b] of progress. */
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a))

const TUNNEL = [
  {
    center: 0.585, side: 'left' as const, dim: 'DIMENSION 01',
    caption: 'The matrix that runs the whole wedding',
    title: 'Guests · invite matrix', action: 'Send invites',
    body: (
      <div>
        <div className="grid grid-cols-[1.5fr_repeat(4,1fr)] gap-y-1.5 text-[9.5px]">
          <span className="font-mono text-[8px] uppercase tracking-wider text-white/40">Household</span>
          {['Mehndi', 'Sangeet', 'Ceremony', 'Reception'].map((e) => (
            <span key={e} className="text-center font-mono text-[8px] uppercase tracking-wider text-white/40">{e}</span>
          ))}
          {[
            ['Priya Shah', 1, 1, 1, 1], ['Raj Shah', 1, 1, 1, 0],
            ['Aarav Shah', 0, 1, 1, 0], ['Meera Patel', 1, 0, 1, 1],
          ].map(([n, ...dots]) => (
            <RowDots key={n as string} name={n as string} dots={dots as number[]} />
          ))}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-white/50">One dot per guest per event. Uninvited events do not exist for that family.</p>
      </div>
    ),
  },
  {
    center: 0.675, side: 'right' as const, dim: 'DIMENSION 02',
    caption: 'Answers land while you watch',
    title: 'RSVPs · landing live', action: '',
    body: (
      <div className="space-y-2 text-[10.5px]">
        {[['Sangeet', 74, 120, '#6D3FA9'], ['Ceremony', 92, 120, '#C9A227']].map(([n, a, c, col]) => (
          <div key={n as string}>
            <p className="flex justify-between text-white/80">
              <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full not-italic" style={{ background: col as string }} />{n}</span>
              <span className="font-mono text-[9.5px] text-white/55">{a} / {c}</span>
            </p>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#3DD68C]" style={{ width: `${((a as number) / (c as number)) * 100}%` }} />
            </div>
          </div>
        ))}
        <p className="rounded-md bg-white/[0.06] px-2.5 py-1.5 text-[9.5px] text-white/70">Priya said yes · just now</p>
        <p className="text-[9.5px] text-white/55">46 veg · 8 kids meals · 3 nut allergies flagged</p>
        <p className="pt-1 text-[10px] leading-relaxed text-white/50">Counts, meals and dietary notes ready to hand to the caterer.</p>
      </div>
    ),
  },
  {
    center: 0.765, side: 'left' as const, dim: 'DIMENSION 03',
    caption: 'Invites with no accounts, ever',
    title: 'Invitations · personal links', action: 'WhatsApp',
    body: (
      <div className="space-y-2.5 text-[10.5px]">
        <p className="font-medium text-white/90">The Shah Family</p>
        <p className="rounded-md bg-white/[0.06] px-2.5 py-1.5 font-mono text-[9px] text-white/60">simvites.co.uk/i/9f2c…d41a · opened twice</p>
        <div className="flex items-center gap-2">
          <span className="grid h-11 w-11 shrink-0 grid-cols-4 gap-px overflow-hidden rounded-sm bg-white p-1">
            {Array.from({ length: 16 }).map((_, i) => (
              <span key={i} className={i % 3 === 0 || i === 5 || i === 10 ? 'bg-black' : 'bg-white'} />
            ))}
          </span>
          <p className="text-[10px] leading-relaxed text-white/50">No guest accounts. One tap from WhatsApp, email or a printed QR.</p>
        </div>
      </div>
    ),
  },
  {
    center: 0.855, side: 'right' as const, dim: 'DIMENSION 04',
    caption: 'Planning that talks to itself',
    title: 'Planning · budget, vendors, seating', action: '',
    body: (
      <div className="space-y-2 text-[10.5px]">
        <p className="flex items-baseline justify-between text-white/80">Budget used
          <span className="font-mono text-[13px] font-semibold text-white">£31,400 <span className="text-[9px] font-normal text-white/45">/ 42k</span></span>
        </p>
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full" style={{ width: '75%', background: 'oklch(0.68 0.19 30)' }} />
        </div>
        <p className="pt-1 font-mono text-[8px] uppercase tracking-wider text-white/40">This week</p>
        {['✓ Caterer booked → budget updated', '✓ Table 4 seated → families told', '○ Florist deposit due Friday'].map((l) => (
          <p key={l} className="text-[10px] text-white/70">{l}</p>
        ))}
        <p className="pt-1 text-[10px] leading-relaxed text-white/50">Book a vendor once. Budget, checklist and dashboard all hear about it.</p>
      </div>
    ),
  },
]

function RowDots({ name, dots }: { name: string; dots: number[] }) {
  return (
    <>
      <span className="text-white/80">{name}{name === 'Aarav Shah' && <i className="ml-1 rounded-sm bg-white/10 px-1 font-mono text-[7px] not-italic text-white/50">child</i>}</span>
      {dots.map((d, i) => (
        <span key={i} className="text-center">
          <i className={`inline-block h-2.5 w-2.5 rounded-full not-italic ${d ? '' : 'border border-white/25'}`}
            style={d ? { background: 'oklch(0.62 0.21 29)' } : undefined} />
        </span>
      ))}
    </>
  )
}

export function DeepZoom() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [demoActive, setDemoActive] = useState(true)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    if (mq.matches) return

    const el = sectionRef.current!
    const stage = stageRef.current!
    const $ = (sel: string) => stage.querySelector(sel) as HTMLElement | null
    const q = {
      hero: $('[data-s=hero]'), frame: $('[data-s=frame]'), dark: $('[data-s=dark]'),
      portal: $('[data-s=portal]'), portalLabel: $('[data-s=portallabel]'), hint: $('[data-s=hint]'),
      cards: TUNNEL.map((_, i) => $(`[data-s=card${i}]`)),
      caps: TUNNEL.map((_, i) => $(`[data-s=cap${i}]`)),
    }
    let lastY = -1
    let raf = 0
    let demoOn = true

    function frame() {
      raf = requestAnimationFrame(frame)
      const y = window.scrollY
      if (y === lastY) return
      lastY = y
      const vh = window.innerHeight
      const total = el.offsetHeight - vh
      const p = clamp((y - el.offsetTop) / total)

      // hero copy fades out over 0–0.08
      if (q.hero) {
        const a = 1 - seg(p, 0, 0.08)
        q.hero.style.opacity = String(a)
        q.hero.style.transform = `translateY(${-seg(p, 0, 0.08) * 60}px)`
        q.hero.style.pointerEvents = a > 0.5 ? 'auto' : 'none'
      }
      if (q.hint) q.hint.style.opacity = String(1 - seg(p, 0, 0.04))

      // dark field 0.03–0.17
      if (q.dark) q.dark.style.opacity = String(seg(p, 0.03, 0.17))

      // demo frame: tilt-in 0→0.14, hold, recede 0.44–0.56. Rests lower &
      // smaller (30vh / 0.58) so it never crowds the hero at the top.
      if (q.frame) {
        const enter = seg(p, 0, 0.14)
        const exit = seg(p, 0.44, 0.56)
        const scale = 0.58 + enter * 0.42 - exit * 0.34
        const rot = 11 * (1 - enter)
        const yShift = (1 - enter) * 30 - exit * 6
        q.frame.style.transform = `perspective(1600px) translateY(${yShift}vh) rotateX(${rot}deg) scale(${scale})`
        q.frame.style.opacity = String(1 - seg(p, 0.5, 0.56))
        q.frame.style.filter = exit > 0 ? `blur(${exit * 3}px)` : 'none'
      }
      const wantDemo = p > 0.02 && p < 0.62
      if (wantDemo !== demoOn) { demoOn = wantDemo; setDemoActive(wantDemo) }

      // tunnel cards
      TUNNEL.forEach((t, i) => {
        const card = q.cards[i]; const cap = q.caps[i]
        if (!card) return
        const span = 0.085
        const d = (p - t.center) / span // -1 far … 0 center … +1 past
        if (d < -1.15 || d > 1.3) { card.style.opacity = '0'; card.style.pointerEvents = 'none'; if (cap) cap.style.opacity = '0'; return }
        let scale: number, op: number
        if (d <= 0) { const a = clamp(d + 1); scale = 0.38 + a * 0.62; op = a }
        else { const a = clamp(d); scale = 1 + a * 1.9; op = 1 - a }
        card.style.opacity = String(op)
        card.style.transform = `translate(-50%, -50%) scale(${scale})`
        if (cap) {
          cap.style.opacity = String(clamp(op * 1.2 - (d > 0 ? d * 1.6 : 0)))
          cap.style.transform = `translateY(${(1 - op) * 30}px)`
        }
      })

      // ivory portal 0.90–0.995
      if (q.portal) {
        const a = seg(p, 0.9, 0.995)
        q.portal.style.transform = `translate(-50%, -50%) scale(${a})`
        if (q.portalLabel) q.portalLabel.style.opacity = String(seg(p, 0.93, 0.985))
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      {/* Fixed glass nav pill */}
      <nav className="fixed left-1/2 top-4 z-50 flex max-w-[calc(100vw-24px)] -translate-x-1/2 flex-nowrap items-center gap-0.5 whitespace-nowrap rounded-[13px] border border-black/[0.07] px-2 py-1.5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)] sm:gap-1"
        style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(14px)' }}>
        <Link href="/" className="flex shrink-0 items-center gap-1.5 px-2 text-[13px] font-semibold tracking-tight text-[#191918]">
          <span className="flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold text-white" style={{ background: 'oklch(0.62 0.21 29)' }}>S</span>
          {BRAND_NAME}
        </Link>
        {[['#product', 'Product'], ['#templates', 'Templates'], ['#rsvp', 'RSVP'], ['#pricing', 'Pricing']].map(([h, l]) => (
          <a key={h} href={h} className="hidden shrink-0 rounded-lg px-2.5 py-1 text-[13px] font-medium text-[#6A6864] hover:text-[#191918] md:block">{l}</a>
        ))}
        <Link href="/login" className="shrink-0 rounded-lg px-2.5 py-1 text-[13px] font-medium text-[#6A6864] hover:text-[#191918]">Sign in</Link>
        <Link href="/login" className="shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-white" style={{ background: 'oklch(0.62 0.21 29)' }}>
          Start free
        </Link>
      </nav>

      {/* Scenes 1–4: the 560vh dive */}
      <section ref={sectionRef} id="product" className="relative" style={{ height: reduced ? 'auto' : '560vh', background: '#FAF8F3' }}>
        <div ref={stageRef} className={reduced ? 'relative' : 'sticky top-0 h-screen overflow-hidden'}>
          {/* soft ivory glow behind the hero (no grid — founder direction) */}
          <div aria-hidden className="absolute inset-0"
            style={{ background: 'radial-gradient(900px 520px at 50% 18%, rgba(255,255,255,0.9), transparent 70%)' }} />

          {/* navy field — slick deep blue with a coral bloom */}
          <div data-s="dark" aria-hidden className="absolute inset-0 opacity-0"
            style={{ background: 'linear-gradient(180deg, #0A1220 0%, #0C1526 55%, #0A1220 100%)' }}>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(720px 500px at 50% 42%, oklch(0.62 0.21 29 / 0.14), transparent 70%)' }} />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(900px 600px at 80% 90%, rgba(70,110,200,0.10), transparent 70%)' }} />
          </div>

          {/* hero copy — top-anchored below the fixed nav, sized to content so
              the headline can never be clipped (mobile or desktop). */}
          <div data-s="hero" className="relative mx-auto flex max-w-[880px] flex-col items-center px-5 pb-6 pt-[104px] text-center sm:pt-[124px]">
            <span className="rounded-full border border-black/10 bg-white px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#6A6864]">
              Per event invitations · live RSVP · zero code
            </span>
            <h1 className="mt-4 font-sans text-[clamp(34px,7vw,76px)] font-[650] leading-[1.0] tracking-[-0.04em] text-[#191918]">
              Every event. Every guest.<br />One platform.
            </h1>
            <p className="mt-4 max-w-[560px] text-[14px] leading-relaxed text-[#6A6864] sm:text-[15px]">
              Build the wedding website, invite each guest to exactly the right events, and watch RSVPs land live.
              Planning, guests and the site itself, finally in one place.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/login" className="rounded-[10px] bg-[#191918] px-5 py-2.5 text-[13.5px] font-semibold text-white">
                Start building free
              </Link>
              <a href="#product" className="rounded-[10px] border border-black/15 bg-white px-5 py-2.5 text-[13.5px] font-medium text-[#191918]">
                ▶ Watch the 60 second take
              </a>
            </div>
          </div>

          {/* demo frame — sits in the lower third at rest; scroll scales it up */}
          <div data-s="frame" className="absolute left-1/2 top-1/2 w-[min(980px,94vw)] -translate-x-1/2 -translate-y-1/2"
            style={{ transform: 'perspective(1600px) translateY(30vh) rotateX(11deg) scale(0.58)', willChange: 'transform, opacity' }}>
            <LiveDemo active={demoActive} />
          </div>

          <p data-s="hint" className="absolute bottom-5 left-0 right-0 text-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#8F8D88]">
            Scroll to dive in ↓
          </p>

          {/* module tunnel */}
          {TUNNEL.map((t, i) => (
            <div key={t.dim}>
              <div data-s={`card${i}`}
                className="absolute left-1/2 top-1/2 w-[min(420px,88vw)] rounded-[14px] border p-5 opacity-0"
                style={{
                  background: '#111C33', borderColor: 'rgba(150,180,255,0.16)',
                  boxShadow: '0 30px 90px -20px oklch(0.62 0.21 29 / 0.25), 0 30px 60px -30px rgba(2,6,16,.7)',
                  transform: 'translate(-50%, -50%) scale(0.38)', willChange: 'transform, opacity',
                }}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-white/45">{t.title}</p>
                  {t.action && <span className="rounded-md px-2 py-1 text-[9.5px] font-semibold text-white" style={{ background: 'oklch(0.62 0.21 29)' }}>{t.action}</span>}
                </div>
                {t.body}
              </div>
              <div data-s={`cap${i}`}
                className={`absolute top-1/2 hidden w-[240px] -translate-y-1/2 opacity-0 lg:block ${t.side === 'left' ? 'left-[7%]' : 'right-[7%] text-right'}`}>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: 'oklch(0.68 0.19 30)' }}>{t.dim}</p>
                <p className="mt-2 text-[30px] font-[650] leading-[1.05] tracking-[-0.03em] text-white">{t.caption}</p>
              </div>
            </div>
          ))}

          {/* ivory portal */}
          <div data-s="portal" className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-full"
            style={{
              width: '130vmax', height: '130vmax', background: 'oklch(0.975 0.006 85)',
              transform: 'translate(-50%, -50%) scale(0)', willChange: 'transform',
            }}>
            <p data-s="portallabel" className="px-6 text-center opacity-0">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#97753F]">Final dimension</span>
              <span className="mt-3 block font-display text-[clamp(30px,4.5vw,52px)] italic text-[#211D18]">the part your guests see</span>
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
