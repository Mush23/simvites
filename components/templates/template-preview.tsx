import { templateFontClasses } from '@/lib/template-fonts'
import type { SiteTemplate } from '@/lib/templates/registry'
import { templateStyle, templateButtonRadius } from '@/lib/templates/registry'

// A real, representative preview of a template — hero, date eyebrow, divider
// motif, a schedule row with event dots and an RSVP button — rendered under
// the template's actual colours, fonts AND style tokens. So the difference a
// couple sees is the difference they get: type, geometry and motif, not just
// swatches.

const EVENTS = [
  { name: 'Mehndi', color: '#3E7C4F' },
  { name: 'Sangeet', color: '#6D3FA9' },
  { name: 'Ceremony', color: '#C9A227' },
]

function Divider({ motif, color }: { motif: string; color: string }) {
  if (motif === 'none') return <div className="my-4 h-3" />
  if (motif === 'diamond') return (
    <div className="my-4 flex items-center justify-center gap-2">
      <span className="h-px w-8" style={{ background: color }} />
      <span className="h-1.5 w-1.5 rotate-45" style={{ background: color }} />
      <span className="h-px w-8" style={{ background: color }} />
    </div>
  )
  if (motif === 'double') return (
    <div className="my-4 flex flex-col items-center gap-1">
      <span className="h-px w-16" style={{ background: color }} />
      <span className="h-px w-10" style={{ background: color }} />
    </div>
  )
  return <div className="mx-auto my-4 h-px w-14" style={{ background: color }} />
}

export function TemplatePreview({ template, compact = false }: { template: SiteTemplate; compact?: boolean }) {
  const style = templateStyle(template.key)
  const v = template.vars
  const bg = v['--paper'] ?? '#F5EFE3'
  const ink = v['--ink'] ?? '#211D18'
  const accent = v['--accent'] ?? '#C9A227'
  const accentInk = v['--accent-ink'] ?? accent
  const line = v['--accent-line'] ?? accent
  const surface = v['--surface'] ?? bg
  const displayFont = v['--font-instrument'] ?? 'var(--f-cormorant)'
  const bodyFont = v['--font-hanken'] ?? 'var(--f-jost)'
  const upper = style.headingCase === 'upper'
  const alignLeft = style.heroAlign === 'left'

  return (
    <div className={templateFontClasses}>
      <div
        data-template-preview={template.key}
        className="overflow-hidden rounded-[10px] border"
        style={{ background: bg, color: ink, borderColor: `${line}66`, fontFamily: bodyFont }}
      >
        <div className={`px-6 ${compact ? 'py-6' : 'py-10'} ${alignLeft ? 'text-left' : 'text-center'}`}>
          <p className="text-[9px] uppercase tracking-[0.24em]" style={{ color: accentInk, fontFamily: bodyFont }}>
            Together with our families
          </p>
          <h2 className={`mt-2 leading-[1.05] ${compact ? 'text-[26px]' : 'text-[34px]'}`}
            style={{ fontFamily: displayFont, color: ink, textTransform: upper ? 'uppercase' : 'none', letterSpacing: upper ? '0.05em' : '-0.01em' }}>
            Aanya &amp; Dev
          </h2>
          <p className="mt-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: accentInk, fontFamily: bodyFont }}>
            19 · 09 · 2026 — Manchester
          </p>

          <div className={alignLeft ? '' : 'mx-auto w-fit'}>
            <Divider motif={style.divider} color={line} />
          </div>

          {!compact && (
            <div className="mx-auto mt-2 max-w-[280px] space-y-2">
              {EVENTS.map((e) => (
                <div key={e.name} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[12px]"
                  style={{ background: surface, border: `1px solid ${line}44` }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                  <span style={{ fontFamily: displayFont, fontSize: 14 }}>{e.name}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider" style={{ color: accentInk }}>Sat · 4pm</span>
                </div>
              ))}
            </div>
          )}

          <div className={`mt-5 ${alignLeft ? '' : 'text-center'}`}>
            <span className="inline-block px-6 py-2.5 text-[12px] font-semibold text-white"
              style={{ background: accent, borderRadius: templateButtonRadius(template.key), textTransform: upper ? 'uppercase' : 'none', letterSpacing: upper ? '0.08em' : 0 }}>
              Kindly RSVP
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
