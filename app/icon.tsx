import { ImageResponse } from 'next/og'

// Generated favicon. Every tab previously showed the browser's default globe.
//
// Generated rather than a checked-in .ico so it stays in step with the brand
// colour, and so there is exactly one place to change it.

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
        S
      </div>
    ),
    { ...size },
  )
}
