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
