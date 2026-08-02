import Link from 'next/link'
import { BRAND_NAME, BASE_DOMAIN } from '@/lib/brand'
import { LEGAL_CONTACT_EMAIL } from '@/lib/legal'
import { DeepZoom } from '@/components/landing/deep-zoom'

// ═══════════════════════════════════════════════════════════════════════
// Marketing landing (design overhaul): scenes 1–4 live in <DeepZoom> (hero,
// dive, module tunnel, ivory portal); this file renders the ivory wedding
// dimension, the USP duo, pricing and the footer. Light, precise, coral.
// ═══════════════════════════════════════════════════════════════════════

export const metadata = {
  title: `${BRAND_NAME} — every event, every guest, one platform`,
  description:
    'Build the wedding website, invite each guest to exactly the right events, and watch RSVPs land live. Planning, guests and the site itself, finally in one place.',
}

const CORAL = 'oklch(0.62 0.21 29)'

export default function LandingPage() {
  return (
    <div className="bg-[#FAF8F3] text-[#191918] dark:bg-[#0A1220] dark:text-[#EEF2FA]">
      <DeepZoom />

      {/* Scene 4b — the wedding dimension (ivory; templates stay ivory in dark
          mode on purpose — the artifact keeps its own identity) */}
      <section id="templates" className="scroll-mt-24 px-6 py-24" style={{ background: 'oklch(0.975 0.006 85)' }}>
        <div className="mx-auto max-w-[1060px]">
          <p className="text-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#97753F]">Templates · the artifact</p>
          <h2 className="mx-auto mt-4 max-w-[640px] text-center font-display text-[clamp(30px,4.4vw,48px)] leading-[1.08] text-[#211D18]">
            The tool is software.<br />What your guests get is <em className="italic">a keepsake</em>.
          </h2>
          <p className="mx-auto mt-4 max-w-[520px] text-center text-[14px] leading-relaxed text-[#5C544A]">
            Editorial templates with real typography and per event colour identities.
            Click any text and type. Nothing goes live until you publish.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {[
              {
                name: 'Editorial Gold', sub: 'Ivory · gold · deep maroon', label: 'COUPLE PHOTO',
                bg: '#F5EFE3', ink: '#211D18', accent: '#C9A227', kicker: '19 · 09 · 2026 — JAIPUR',
              },
              {
                name: 'Editorial Luxury', sub: 'Cream · ink · antique brass', label: 'VENUE PHOTO',
                bg: '#F6F1E9', ink: '#211D18', accent: '#B08D57', kicker: 'FOUR EVENTS · ONE WEEKEND',
              },
            ].map((t) => (
              <figure key={t.name} className="overflow-hidden rounded-[14px] border border-[#E0D8CB] bg-white shadow-[0_24px_60px_-24px_rgba(33,29,24,0.25)]">
                <div className="relative flex h-[230px] flex-col items-center justify-center text-center" style={{ background: t.bg }}>
                  <span className="absolute left-3 top-3 rounded-sm border border-black/10 px-1.5 py-0.5 font-mono text-[7.5px] tracking-wider text-black/35">{t.label}</span>
                  <p className="font-display text-[34px] leading-none" style={{ color: t.ink }}>Aanya <em className="italic" style={{ color: t.accent }}>&amp;</em> Dev</p>
                  <p className="mt-3 font-mono text-[8.5px] uppercase tracking-[0.22em]" style={{ color: t.accent }}>{t.kicker}</p>
                </div>
                <figcaption className="flex items-baseline justify-between px-5 py-4">
                  <span className="font-display text-[17px] text-[#211D18]">{t.name}</span>
                  <span className="text-[11.5px] text-[#8A8072]">{t.sub}</span>
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {[['Mehndi', '#3E7C4F'], ['Sangeet', '#6D3FA9'], ['Ceremony', '#C9A227'], ['Reception', '#7A1F1F']].map(([n, c]) => (
              <span key={n} className="flex items-center gap-2 rounded-full border border-[#E0D8CB] bg-white px-3.5 py-1.5 text-[12px] text-[#5C544A]">
                <span className="h-2 w-2 rounded-full" style={{ background: c }} />{n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Scene 5 — USP duo */}
      <section id="rsvp" className="scroll-mt-24 px-6 py-24">
        <div className="mx-auto max-w-[1060px]">
          <p className="text-center font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#8F8D88] dark:text-[#5B6A8C]">Why couples switch</p>
          <h2 className="mt-3 text-center text-[clamp(26px,3.6vw,40px)] font-[650] leading-tight tracking-[-0.03em]">
            Two things nobody else does properly
          </h2>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {/* USP 01 */}
            <div className="rounded-[14px] border border-[#EAE5DA] bg-white p-7 shadow-[0_1px_2px_rgba(15,15,20,0.04)] dark:border-[#223252] dark:bg-[#111C33]">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.1em]" style={{ color: CORAL }}>USP 01 · Per event invitations</p>
              <h3 className="mt-2.5 text-[20px] font-[650] tracking-[-0.02em]">Every guest sees only their events</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#6A6864] dark:text-[#8FA0C4]">
                Grandma gets the ceremony. College friends get the sangeet and the afterparty.
                Same website, different wedding for each family.
              </p>
              <div className="mt-6 flex items-center gap-4">
                <div className="flex-1 rounded-xl border border-[#EAE5DA] bg-[#FAF8F3] p-3.5">
                  <p className="mb-2 font-mono text-[8px] uppercase tracking-wider text-[#8F8D88]">The Shah Family · link</p>
                  <div className="grid grid-cols-[1fr_repeat(3,32px)] gap-y-1.5 text-[11px]">
                    <span />
                    {['Mehndi', 'Sangeet', 'Ceremony'].map((e) => <span key={e} className="text-center font-mono text-[7px] uppercase text-[#8F8D88]">{e}</span>)}
                    {[['Priya', 1, 1, 1], ['Aarav', 0, 1, 1]].map(([n, ...d]) => (
                      <SharedRow key={n as string} name={n as string} dots={d as number[]} />
                    ))}
                  </div>
                </div>
                <span className="text-[#8F8D88]">→</span>
                <div className="w-[132px] shrink-0 rounded-[18px] border-[3px] border-[#191918] bg-[#F5EFE3] px-3 py-4 text-center">
                  <p className="font-display text-[13px] text-[#211D18]">Aanya &amp; Dev</p>
                  <p className="mt-2 text-[8.5px] text-[#5C544A]">Sangeet · Fri 7pm</p>
                  <p className="text-[8.5px] text-[#5C544A]">Ceremony · Sat 11am</p>
                  <p className="mt-2 font-mono text-[7px] uppercase tracking-wide text-[#97753F]">Mehndi? Not on Aarav&apos;s list.</p>
                </div>
              </div>
            </div>

            {/* USP 02 */}
            <div className="rounded-[14px] border border-[#EAE5DA] bg-white p-7 shadow-[0_1px_2px_rgba(15,15,20,0.04)] dark:border-[#223252] dark:bg-[#111C33]">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.1em]" style={{ color: CORAL }}>USP 02 · The RSVP engine</p>
              <h3 className="mt-2.5 text-[20px] font-[650] tracking-[-0.02em]">One tap for the family, answers for the caterer</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#6A6864] dark:text-[#8FA0C4]">
                A household answers once, per person, per event, with your custom questions.
                You get live totals and one clean export.
              </p>
              <div className="mt-6 flex items-center gap-4">
                <div className="flex-1 rounded-xl border border-[#EAE5DA] bg-[#FAF8F3] p-3.5 text-[11px]">
                  <p className="font-medium">Sangeet · are you in?</p>
                  <p className="mt-2 flex gap-1.5">
                    <span className="rounded-md px-2 py-1 text-[10px] font-semibold text-white" style={{ background: '#1B9E5F' }}>Joyfully yes</span>
                    <span className="rounded-md border border-[#DBDAD6] px-2 py-1 text-[10px] text-[#6A6864]">Sadly no</span>
                  </p>
                  <p className="mt-2.5 text-[10px] text-[#8F8D88]">Meal</p>
                  <p className="mt-1 flex gap-1.5">
                    {['Veg', 'Chicken', 'Kids'].map((m, i) => (
                      <span key={m} className={`rounded-md px-2 py-0.5 text-[10px] ${i === 0 ? 'bg-[#191918] text-white' : 'border border-[#DBDAD6] text-[#6A6864]'}`}>{m}</span>
                    ))}
                  </p>
                </div>
                <span className="text-[#8F8D88]">→</span>
                <div className="w-[132px] shrink-0 rounded-xl border border-[#EAE5DA] bg-white p-3">
                  <p className="font-mono text-[7.5px] uppercase tracking-wider text-[#8F8D88]">Live totals</p>
                  {[['Attending', '74'], ['Vegetarian', '46'], ['Nut allergies', '3']].map(([l, v]) => (
                    <p key={l} className="mt-1.5 flex justify-between text-[10px] text-[#6A6864]">{l}<b className="font-mono text-[#191918]">{v}</b></p>
                  ))}
                  <p className="mt-2 text-[9px] font-medium" style={{ color: CORAL }}>Export for the caterer ↓</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What you get — the full picture, so nobody has to guess (D7) */}
      <section id="what-you-get" className="scroll-mt-24 px-6 pb-24">
        <div className="mx-auto max-w-[1060px]">
          <p className="text-center font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#8F8D88] dark:text-[#5B6A8C]">Everything included</p>
          <h2 className="mt-3 text-center text-[clamp(26px,3.6vw,40px)] font-[650] leading-tight tracking-[-0.03em]">
            One platform, the whole wedding
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['🕌', 'Multi-event website', '18 templates, 10 looks per section, your fonts and colours — published as a keepsake your guests treasure.'],
              ['✉️', 'Personal invitations', 'Every household gets its own private link — by email, WhatsApp or a QR on the printed card.'],
              ['✓', 'Per-event RSVP', 'Custom questions, meal choices, deadlines and capacity — answered per person, per event.'],
              ['🪑', 'Seating planner', 'Upload your floor plan, drag tables into place, seat every name. Guests see their table on their invite.'],
              ['💷', 'Budget & payments', 'Vendor payment schedules linked to your budget, with reminders before every due date.'],
              ['🤖', 'AI planning help', 'Paste any messy guest list and it becomes households. Ask the assistant anything about your own wedding.'],
            ].map(([icon, title, body]) => (
              <div key={title as string} className="rounded-[14px] border border-[#EAE5DA] bg-white p-6 dark:border-[#223252] dark:bg-[#111C33]">
                <p className="text-[20px]">{icon}</p>
                <h3 className="mt-2 text-[15px] font-[650] tracking-[-0.01em]">{title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6A6864] dark:text-[#8FA0C4]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ (D7) — the questions every couple actually asks */}
      <section id="faq" className="scroll-mt-24 px-6 pb-24">
        <div className="mx-auto max-w-[760px]">
          <p className="text-center font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#8F8D88] dark:text-[#5B6A8C]">Questions, answered</p>
          <h2 className="mt-3 text-center text-[clamp(26px,3.6vw,40px)] font-[650] leading-tight tracking-[-0.03em]">
            Before you ask
          </h2>
          <div className="mt-10 space-y-3">
            {[
              ['Do my guests need an app or an account?',
                'No. Guests tap their personal link and RSVP in the browser — no downloads, no passwords, no accounts. It works on any phone.'],
              ['Can different guests see different events?',
                'Yes — that is the whole point. You invite each guest to exactly the right events, and their website only shows those. Grandma never sees the afterparty.'],
              ['How do payments work?',
                'Everything is free while you build. One payment unlocks publishing and sending invitations — no subscription, and your site stays live for 18 months after the wedding.'],
              ['Can I change the design after publishing?',
                'Any time. Edit, restyle or add events, then publish again — guests always see the latest version, and your RSVPs are never lost.'],
              ['What if my guest list is a messy spreadsheet?',
                'Paste it in. The importer (with AI help) groups families into households, splits “Raj & Priya Shah” into two guests, and previews everything before it saves.'],
              ['Do you support Indian wedding events?',
                'It is built for them: mehndi, haldi, sangeet, baraat, nikah, pheras, walima, receptions — any number of events, each with its own colour, capacity and guest list.'],
              ['Can family help me manage it?',
                'Yes — invite collaborators from Settings. They sign in with their own email and can help with guests, RSVPs and planning.'],
              ['What happens to RSVP answers?',
                'They roll up live per event — attending, declined, pending, meals and dietary notes — and export as one clean CSV your caterer will love.'],
            ].map(([q, a]) => (
              <details key={q as string} className="group rounded-[12px] border border-[#EAE5DA] bg-white px-5 py-4 dark:border-[#223252] dark:bg-[#111C33]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14.5px] font-[600] tracking-[-0.01em] [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="text-[#8F8D88] transition-transform group-open:rotate-45 dark:text-[#5B6A8C]">＋</span>
                </summary>
                <p className="mt-3 text-[13px] leading-relaxed text-[#6A6864] dark:text-[#8FA0C4]">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-24 px-6 pb-24">
        <div className="mx-auto max-w-[760px] overflow-hidden rounded-[22px] p-10 text-center sm:p-14"
          style={{ background: '#0A1220', boxShadow: '0 40px 90px -20px rgba(0,0,0,0.45)' }}>
          <div className="pointer-events-none absolute" aria-hidden />
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: 'oklch(0.68 0.19 30)' }}>Early access</p>
          <h2 className="mx-auto mt-3 max-w-[480px] text-[clamp(26px,3.6vw,38px)] font-[650] leading-tight tracking-[-0.03em] text-white">
            Build everything free. Pay once when you send.
          </h2>
          <p className="mx-auto mt-4 max-w-[520px] text-[13.5px] leading-relaxed text-white/60">
            No subscription. One payment unlocks publishing and sending, and your site stays live for
            18 months after the wedding. Early couples shape the product and keep founder pricing.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className="rounded-[10px] px-5 py-2.5 text-[13.5px] font-semibold text-white" style={{ background: CORAL }}>
              Start your site
            </Link>
            <a href="mailto:maharshi.sim@hotmail.com" className="rounded-[10px] border border-white/20 px-5 py-2.5 text-[13.5px] font-medium text-white/85">
              Talk to the founder
            </a>
          </div>
          <div className="mx-auto mt-10 max-w-[440px] space-y-4 text-left">
            {[
              ['Everything unlocked while you build', 'Website, guests, matrix, planning. Free until send day.'],
              ['One payment, no subscription', 'Pay when you publish and send invites. That is it.'],
              ['Live 18 months after the wedding', 'Photos, thank yous and the memory stay up.'],
            ].map(([t, d]) => (
              <p key={t} className="flex gap-3 text-[13px]">
                <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: '#1B9E5F' }}>✓</span>
                <span className="text-white/85"><b className="font-semibold text-white">{t}</b><br /><span className="text-white/55">{d}</span></span>
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#EAE5DA] px-6 py-14 dark:border-[#223252]">
        <div className="mx-auto grid max-w-[1060px] gap-10 sm:grid-cols-4">
          <div>
            <p className="flex items-center gap-1.5 text-[13px] font-semibold tracking-tight">
              <span className="flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold text-white" style={{ background: CORAL }}>{BRAND_NAME[0]}</span>
              {BRAND_NAME}
            </p>
            <p className="mt-3 max-w-[220px] text-[12px] leading-relaxed text-[#8F8D88]">
              The platform for multi event weddings. Website, invitations, RSVPs and planning, connected.
            </p>
          </div>
          {[
            ['Product', [['#product', 'The editor'], ['#rsvp', 'Invitations & RSVP'], ['#templates', 'Templates'], ['#pricing', 'Pricing']]],
            ['Company', [['mailto:maharshi.sim@hotmail.com', 'Early access'], ['mailto:maharshi.sim@hotmail.com', 'Talk to the founder'], ['#', 'Changelog']]],
            ['Legal', [['/privacy', 'Privacy'], ['/cookies', 'Cookies'], ['/terms', 'Terms'], [`mailto:${LEGAL_CONTACT_EMAIL}`, 'Contact']]],
          ].map(([group, links]) => (
            <div key={group as string}>
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8F8D88]">{group as string}</p>
              <ul className="mt-3 space-y-2">
                {(links as [string, string][]).map(([h, l]) => (
                  <li key={l}><a href={h} className="text-[12.5px] text-[#6A6864] hover:text-[#191918] dark:text-[#8FA0C4] dark:hover:text-[#EEF2FA]">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-12 flex max-w-[1060px] items-center justify-between text-[11px] text-[#8F8D88]">
          <span>© 2026 {BRAND_NAME}. Made for the big weekend.</span>
          <span className="font-mono">{BASE_DOMAIN}</span>
        </p>
      </footer>
    </div>
  )
}

function SharedRow({ name, dots }: { name: string; dots: number[] }) {
  return (
    <>
      <span className="text-[#191918]">{name}</span>
      {dots.map((d, i) => (
        <span key={i} className="text-center">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${d ? '' : 'border border-[#DBDAD6]'}`}
            style={d ? { background: CORAL } : undefined} />
        </span>
      ))}
    </>
  )
}
