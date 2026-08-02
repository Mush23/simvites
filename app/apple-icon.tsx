import { ImageResponse } from 'next/og'
import { BRAND_NAME } from '@/lib/brand'

// Home-screen icon for iOS. Same mark as the favicon, sized for the larger
// canvas — iOS applies its own rounding, so this one is square.

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#EA3E31',
          color: '#FFFFFF',
          fontSize: 118,
          fontWeight: 700,
        }}
      >
        {BRAND_NAME[0]}
      </div>
    ),
    { ...size },
  )
}
