'use client'

// Error boundary for the couple's PUBLISHED site.
//
// Without this, failures here fell through to app/error.tsx — which greets a
// wedding guest with the Simvites wordmark and "Something went wrong." A guest
// opening their invitation should never see the tool their hosts happened to
// use; as far as they are concerned this is the couple's website.
//
// Deliberately template-agnostic. An error boundary cannot fetch, so the
// couple's theme variables are not available here — the warm literals below
// read as a keepsake page under any template rather than borrowing the app's
// chrome. The display serif comes free from the layout's font pool.

export default function PublicSiteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        textAlign: 'center',
        background: '#F7F3EC',
        color: '#1B1917',
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <h1
          style={{
            fontFamily: 'var(--f-cormorant), Georgia, serif',
            fontSize: 34,
            fontWeight: 400,
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          This page didn&rsquo;t load
        </h1>
        <p style={{ marginTop: 14, lineHeight: 1.65, fontSize: 15, color: '#5C554D' }}>
          Something went wrong at our end, not yours. It is usually temporary &mdash;
          please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 28,
            padding: '12px 28px',
            borderRadius: 999,
            border: '1px solid #1B1917',
            background: 'transparent',
            color: '#1B1917',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
