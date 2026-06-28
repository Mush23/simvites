import { cn } from '@/lib/utils'

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <div className="mb-8">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="font-display text-4xl text-ink">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-ink-2">{description}</p>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  bar,
}: {
  label: string
  value: string | number
  hint?: string
  bar?: number // 0..100
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-6 shadow-card">
      <p className="eyebrow mb-3">{label}</p>
      <p className="font-display text-5xl nums text-ink">{value}</p>
      {hint && <p className="mt-2 text-sm text-ink-2">{hint}</p>}
      {typeof bar === 'number' && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-pill bg-paper-2">
          <div className="h-full rounded-pill bg-accent" style={{ width: `${Math.max(0, Math.min(100, bar))}%` }} />
        </div>
      )}
    </div>
  )
}

export function ComingSoon({ phase, children }: { phase: string; children?: React.ReactNode }) {
  return (
    <div className={cn('rounded-card border border-dashed border-line bg-paper-2 p-10 text-center')}>
      <p className="eyebrow mb-2">{phase}</p>
      <p className="text-ink-2">{children ?? 'This module is part of an upcoming phase.'}</p>
    </div>
  )
}
