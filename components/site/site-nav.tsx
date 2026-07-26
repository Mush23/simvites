import type { SiteStyle } from '@/lib/site-style'

// Public-site menu (Sprint D, + D6 designs): monogram / initials + page
// links in one of four styles chosen in the editor's Style panel. Renders
// nothing for single-page sites without a brand mark, so plain sites look
// exactly as before. Links are root-relative — on a tenant subdomain the
// proxy rewrites them to the site (same convention as the RSVP CTA).

export interface NavPage {
  slug: string
  title: string
  is_home: boolean
  nav_order?: number | null
  hidden?: boolean | null
}

const MARK_SIZES: Record<number, string> = { 7: 'h-7 w-7', 9: 'h-9 w-9', 11: 'h-11 w-11' }

function BrandMark({ t, size = 9 }: { t: SiteStyle; size?: number }) {
  const cls = MARK_SIZES[size] ?? MARK_SIZES[9]
  return t.monogram ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={t.monogram} alt={t.initials || 'Monogram'}
      className={`${cls} rounded-full border object-cover`} style={{ borderColor: 'var(--accent-line)' }} />
  ) : (
    <span className={`flex ${cls} items-center justify-center rounded-full border font-display text-sm`}
      style={{ borderColor: 'var(--accent-line)', color: 'var(--accent-ink)' }}>
      {t.initials}
    </span>
  )
}

function NavLinks({ pages, currentSlug, className = '' }: {
  pages: NavPage[]; currentSlug?: string; className?: string
}) {
  return (
    <nav className={`flex flex-wrap items-center gap-5 ${className}`}>
      {pages.map((p) => {
        const href = p.is_home ? '/' : `/${p.slug}`
        const active = (p.is_home && !currentSlug) || p.slug === currentSlug
        return (
          <a key={p.slug} href={href}
            className="font-mono text-[10px] uppercase tracking-[0.18em] transition-colors"
            style={{ color: active ? 'var(--accent-ink)' : 'var(--ink-3)' }}>
            {p.title}
          </a>
        )
      })}
    </nav>
  )
}

export function SiteNav({ pages, theme, currentSlug }: {
  pages: NavPage[]
  theme: unknown
  /** Slug of the page being rendered ('' for home). */
  currentSlug?: string
}) {
  const t = (theme ?? {}) as SiteStyle
  const visible = (pages ?? [])
    .filter((p) => !p.hidden)
    .sort((a, b) => (a.is_home === b.is_home ? (a.nav_order ?? 0) - (b.nav_order ?? 0) : a.is_home ? -1 : 1))
  const hasBrand = Boolean(t.monogram || t.initials)
  if (!hasBrand && visible.length < 2) return null
  const links = visible.length > 1 ? visible : []
  const design = t.nav ?? 'glass'

  if (design === 'banner') {
    return (
      <header className="sticky top-0 z-[var(--z-sticky)] flex items-center justify-between gap-6 px-6 py-3"
        style={{ background: 'var(--surface)', borderBottom: '2px solid var(--accent-line)' }}>
        {hasBrand ? <BrandMark t={t} /> : <span />}
        {links.length > 0 && <NavLinks pages={links} currentSlug={currentSlug} />}
      </header>
    )
  }

  if (design === 'centered') {
    return (
      <header className="sticky top-0 z-[var(--z-sticky)] flex flex-col items-center gap-2.5 border-b px-6 py-4"
        style={{
          borderColor: 'var(--line)',
          background: 'color-mix(in oklab, var(--paper) 92%, transparent)',
          backdropFilter: 'blur(10px)',
        }}>
        {hasBrand && <BrandMark t={t} size={11} />}
        {links.length > 0 && <NavLinks pages={links} currentSlug={currentSlug} className="justify-center" />}
      </header>
    )
  }

  if (design === 'minimal') {
    return (
      <header className="flex items-center justify-between gap-6 px-6 py-2.5"
        style={{ borderBottom: '1px solid var(--line)' }}>
        {hasBrand ? <BrandMark t={t} size={7} /> : <span />}
        {links.length > 0 && <NavLinks pages={links} currentSlug={currentSlug} />}
      </header>
    )
  }

  // 'glass' — the original centered translucent bar.
  return (
    <header
      className="sticky top-0 z-[var(--z-sticky)] flex items-center justify-center gap-6 border-b px-6 py-3"
      style={{
        borderColor: 'var(--line)',
        background: 'color-mix(in oklab, var(--paper) 88%, transparent)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {hasBrand && <BrandMark t={t} />}
      {links.length > 0 && <NavLinks pages={links} currentSlug={currentSlug} />}
    </header>
  )
}
