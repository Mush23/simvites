import { ImageResponse } from 'next/og'
import { getPublishedSnapshot } from '@/lib/public-site'
import { deriveInitials } from '@/lib/utils'
import { getTemplate } from '@/lib/templates/registry'
import { toStaticHex } from '@/lib/color'

// Favicon for the couple's PUBLISHED site — their monogram, not ours.
//
// Same reasoning as the error boundary beside this file: a guest's browser tab
// belongs to the couple. Without this the root app/icon.tsx applies and every
// wedding site flies the Milestones mark.
//
// Drawn in the site's OWN template colours, so the tab matches the page it
// belongs to.

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// Favicons are requested constantly and change only when a couple renames their
// site or switches template, so this is cached rather than hit per request.
export const revalidate = 3600

export default async function SiteIcon({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params
  const snap = await getPublishedSnapshot(siteSlug)

  const theme = (snap?.theme ?? {}) as { template?: string; initials?: string }
  const template = getTemplate(theme.template)
  // The template's own ink and paper, so the mark sits in its world — resolved
  // to plain hex first. Satori cannot parse oklch() and several themes (the
  // DEFAULT one included) declare their paper and ink that way; passing the raw
  // value through threw "Unexpected token type: function" and killed the route.
  const ink = toStaticHex(template.vars['--ink'], '#1B1917')
  const paper = toStaticHex(template.vars['--paper'], '#F7F3EC')

  // "A·D" is two glyphs plus a separator — too wide at 32px, so the separator
  // is dropped here and only the letters carry.
  const initials = deriveInitials(snap?.title ?? 'Wedding', theme.initials).replace(/·/g, '')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: paper,
          color: ink,
          fontSize: initials.length > 1 ? 17 : 22,
          fontWeight: 600,
          letterSpacing: -0.5,
        }}
      >
        {initials || 'W'}
      </div>
    ),
    { ...size },
  )
}
