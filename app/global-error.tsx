'use client'

// Last-resort boundary: catches errors thrown by the ROOT layout itself, which
// app/error.tsx sits inside and therefore cannot catch. Without it those
// failures render the framework's default error screen.
//
// This replaces the root layout when it fires, so it must supply its own
// <html>/<body> — and globals.css, imported by that layout, is not applied.
// Hence inline styles and literal colours rather than tokens.

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 24px',
            textAlign: 'center',
            background: '#FAF8F3',
            color: '#1A1916',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          }}
        >
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 28, fontWeight: 650, letterSpacing: '-0.02em', margin: 0 }}>
              Something went wrong.
            </h1>
            <p style={{ marginTop: 14, lineHeight: 1.65, fontSize: 15, color: '#6B675E' }}>
              Nothing is lost — your data is safe. Try again, and if it keeps happening, tell us.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 28,
                padding: '12px 28px',
                borderRadius: 8,
                border: 'none',
                background: '#EA3E31',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
