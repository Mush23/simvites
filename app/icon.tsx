import { ImageResponse } from 'next/og'
import { BRAND_NAME } from '@/lib/brand'

// Generated favicon. Every tab previously showed the browser's default globe.
//
// Generated rather than a checked-in .ico so it stays in step with the brand
// colour, and so there is exactly one place to change it.
//
// The letter is derived from BRAND_NAME rather than hardcoded: the rename to
// Milestones left an "S" here, in the one place nobody looks at in a diff and
// everybody looks at in a browser tab.
//
// ── Why this is NOT the MS monogram ──────────────────────────────────────
// It was rendered at 32, 48 and 64px and looked at, magnified, side by side.
// The monogram is a high-contrast serif: at 32px its hairlines and the swash
// break up into a pink smudge, legible as neither M nor S. It is clean by
// 64px. So the mark is used where it has room — app/apple-icon.png at 180px,
// public/brand/* — and the letterform holds the 32px slot. A logo that is
// unreadable at the size it is actually displayed is not a logo there.
// Regenerate the assets with: node scripts/build-brand-assets.mjs

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Solid coral rather than an ivory ground: at 32px against a browser
          // chrome that may be light OR dark, a filled mark stays legible where
          // a pale one disappears.
          background: '#EA3E31',
          color: '#FFFFFF',
          fontSize: 22,
          fontWeight: 700,
          borderRadius: 7,
        }}
      >
        {BRAND_NAME[0]}
      </div>
    ),
    { ...size },
  )
}
