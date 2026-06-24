import type { SiteTheme } from '@/lib/types'

/**
 * Injects a site's theme overrides as scoped CSS custom properties. Only the
 * tokens that differ from globals.css are emitted; everything else cascades.
 * Light overrides apply at the scope root; dark overrides apply when a `.dark`
 * ancestor is present, matching the @custom-variant in globals.css.
 */
export function ThemeStyle({
  theme,
  scope = '[data-site-root]',
}: {
  theme: SiteTheme
  scope?: string
}) {
  const toVars = (tokens: Record<string, string>) =>
    Object.entries(tokens)
      .map(([k, v]) => `--${k}:${v};`)
      .join('')

  const light = theme.colors.light ?? {}
  const dark = theme.colors.dark ?? {}

  const css = [
    Object.keys(light).length
      ? `${scope}{${toVars(light as Record<string, string>)}}`
      : '',
    Object.keys(dark).length
      ? `.dark ${scope},${scope}.dark{${toVars(dark as Record<string, string>)}}`
      : '',
  ]
    .filter(Boolean)
    .join('')

  if (!css) return null
  return <style dangerouslySetInnerHTML={{ __html: css }} />
}
