import { cn } from '@/lib/utils'

export function SectionHeading({
  kicker,
  title,
  className,
}: {
  kicker?: string
  title: string
  className?: string
}) {
  return (
    <div className={cn('text-center', className)}>
      {kicker && (
        <p className="mb-3 text-[0.7rem] uppercase tracking-luxury text-gold-ink">
          {kicker}
        </p>
      )}
      <h2 className="underline-draw inline-block font-heading text-4xl font-light text-foreground sm:text-5xl">
        {title}
      </h2>
    </div>
  )
}
