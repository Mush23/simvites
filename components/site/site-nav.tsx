import type { SiteStyle } from '@/lib/site-style'

// Public-site menu (Sprint D): monogram / initials + page links. Renders
// nothing for single-page sites without a brand mark, so existing sites
// look exactly as before. Links are root-relative — on a tenant subdomain
// the proxy rewrites them to the site (same convention as the RSVP CTA).

export interface NavPage {
  slug: string
  title: string
  is_home: boolean
  nav_order?: number | null
  hidden?: boolean | null
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

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-center gap-6 border-b px-6 py-3"
      style={{
        borderColor: 'var(--line)',
        background: 'color-mix(in oklab, var(--paper) 88%, transparent)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {hasBrand && (
        t.monogram ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.monogram} alt={t.initials || 'Monogram'}
            className="h-9 w-9 rounded-full border object-cover" style={{ borderColor: 'var(--accent-line)' }} />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full border font-display text-sm"
            style={{ borderColor: 'var(--accent-line)', color: 'var(--accent-ink)' }}>
            {t.initials}
          </span>
        )
      )}
      {visible.length > 1 && (
        <nav className="flex flex-wrap items-center gap-5">
          {visible.map((p) => {
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
      )}
    </header>
  )
}
