import { backdropOf } from '@/lib/site-style'

/**
 * Full-page backdrop effect layer (Style panel → "Backdrop effect"). Pure
 * CSS, tinted by the template's own accent vars, silenced by the global
 * reduced-motion rule. Sits at z-0 under the content wrapper (z-1) so it
 * never covers text or blocks clicks.
 */
export function BackdropFx({ theme }: { theme: unknown }) {
  const b = backdropOf(theme)
  if (b === 'none') return null
  return <div aria-hidden data-backdrop={b} className="pointer-events-none absolute inset-0 z-0 overflow-hidden" />
}
