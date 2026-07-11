import { templateFontClasses } from '@/lib/template-fonts'

// The Save-the-Date artifact. Serif, ivory, per-palette — the couple-facing
// keepsake voice. Pure + server-safe so it renders in the editor preview and
// on the public page identically.

export interface StdData {
  headline: string
  names: string | null
  message: string | null
  dateText: string | null
  location: string | null
  photoUrl: string | null
  palette: string
  events: { name: string; accent: string | null; dateText: string | null }[]
}

const PALETTES: Record<string, { bg: string; ink: string; accent: string; sub: string; font: string }> = {
  template: { bg: '#F5EFE3', ink: '#211D18', accent: '#C9A227', sub: '#6E635A', font: 'var(--f-cormorant)' },
  gold: { bg: '#FBF6EA', ink: '#2A2413', accent: '#B8912E', sub: '#7A6C4E', font: 'var(--f-cormorant)' },
  oxblood: { bg: '#F6E9E6', ink: '#3A1B1B', accent: '#7E3232', sub: '#8A5C5C', font: 'var(--f-playfair)' },
  sage: { bg: '#EEF2E8', ink: '#263324', accent: '#5C6852', sub: '#6E7A63', font: 'var(--f-marcellus)' },
  ink: { bg: '#F3F1EC', ink: '#1B1B19', accent: '#8A8072', sub: '#6A645C', font: 'var(--f-fraunces)' },
  midnight: { bg: '#0F1B32', ink: '#EFE6D2', accent: '#D4AF6A', sub: '#B7AC93', font: 'var(--f-cormorant)' },
}

/** The resolved palette for a key — lets the public stage tint itself to match. */
export const stdPaletteOf = (key: string) => PALETTES[key] ?? PALETTES.template

export function StdCard({ data, forPrint = false }: { data: StdData; forPrint?: boolean }) {
  const p = PALETTES[data.palette] ?? PALETTES.template
  return (
    <div className={templateFontClasses}>
      <div
        data-std-card
        className="relative mx-auto overflow-hidden"
        style={{
          width: forPrint ? '100%' : 'min(440px, 92vw)',
          aspectRatio: '5 / 7',
          background: p.bg,
          color: p.ink,
          border: `1px solid ${p.accent}33`,
          borderRadius: forPrint ? 0 : 4,
          fontFamily: p.font,
        }}
      >
        {data.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.photoUrl} alt="" className="h-[46%] w-full object-cover" />
        )}
        <div className="flex flex-col items-center px-8 py-8 text-center" style={{ height: data.photoUrl ? '54%' : '100%', justifyContent: 'center' }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em]" style={{ color: p.accent, fontFamily: 'var(--f-jost, monospace)' }}>
            {data.headline}
          </p>
          <div className="my-3 h-px w-12" style={{ background: p.accent }} />
          <h1 className="text-[clamp(30px,7vw,44px)] leading-[1.02]" style={{ color: p.ink }}>{data.names || 'Your names'}</h1>
          {data.dateText && (
            <p className="mt-4 text-[15px] tracking-wide" style={{ color: p.accent }}>{data.dateText}</p>
          )}
          {data.location && (
            <p className="mt-1 text-[13px]" style={{ color: p.sub, fontFamily: 'var(--f-jost, sans-serif)' }}>{data.location}</p>
          )}
          {data.message && (
            <p className="mt-4 max-w-[30ch] text-[13.5px] leading-relaxed" style={{ color: p.sub }}>{data.message}</p>
          )}
          {data.events.length > 0 && (
            <div className="mt-5 space-y-1.5">
              {data.events.map((e, i) => (
                <p key={i} className="flex items-center justify-center gap-2 text-[12px]" style={{ color: p.sub, fontFamily: 'var(--f-jost, sans-serif)' }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: e.accent ?? p.accent }} />
                  <span style={{ color: p.ink }}>{e.name}</span>
                  {e.dateText && <span>· {e.dateText}</span>}
                </p>
              ))}
            </div>
          )}
          <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: p.sub, fontFamily: 'var(--f-jost, monospace)' }}>
            Formal invitation to follow
          </p>
        </div>
      </div>
    </div>
  )
}

export const STD_PALETTES = Object.keys(PALETTES)
