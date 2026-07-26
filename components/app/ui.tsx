import { cn } from '@/lib/utils'

// Shared module primitives (overhaul): sans page headers, Geist Mono data
// values, hairline cards. Every module inherits the new voice from here.

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  /** Kept for call-site compatibility; rendered as a quiet context line. */
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <div className="mb-7">
      {eyebrow && <p className="mb-1 text-[12px] font-medium text-ink-3">{eyebrow}</p>}
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
      {description && <p className="mt-1.5 max-w-2xl text-[13.5px] text-ink-2">{description}</p>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  bar,
  tone = 'progress',
}: {
  label: string
  value: string | number
  hint?: string
  bar?: number // 0..100
  /** What the bar MEANS. 'progress' is work in flight (neutral); 'money' is
   *  value banked, which reads as success. Neither is the brand accent — a
   *  bar is never the thing you click. */
  tone?: 'progress' | 'money'
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <p className="text-[12px] font-medium text-ink-2">{label}</p>
      <p className="mt-2 font-mono text-[22px] font-semibold tracking-tight nums text-ink">{value}</p>
      {hint && <p className="mt-1.5 text-[12.5px] text-ink-3">{hint}</p>}
      {typeof bar === 'number' && (
        <div className="mt-3.5 h-1 w-full overflow-hidden rounded-full bg-progress-track">
          <div
            className={cn('h-full rounded-full', bar >= 100 || tone === 'money' ? 'bg-progress-done' : 'bg-progress-fill')}
            style={{ width: `${Math.max(0, Math.min(100, bar))}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function ComingSoon({ phase, children }: { phase: string; children?: React.ReactNode }) {
  return (
    <div className={cn('rounded-card border border-dashed border-line bg-paper-2 p-10 text-center')}>
      <p className="mb-2 text-[12px] font-medium text-ink-3">{phase}</p>
      <p className="text-ink-2">{children ?? 'This module is part of an upcoming phase.'}</p>
    </div>
  )
}
