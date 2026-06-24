export function Footer({
  coupleInitials,
  dateDisplay,
}: {
  coupleInitials: string
  dateDisplay: string
}) {
  return (
    <footer className="border-t border-border bg-secondary/30 py-16 text-center">
      <p className="font-heading text-4xl font-light text-foreground">
        {coupleInitials}
      </p>
      <div className="my-5 flex items-center justify-center gap-4">
        <span className="h-px w-8 bg-gold/60" />
        <span className="text-[0.7rem] uppercase tracking-wide-soft text-muted-foreground">
          {dateDisplay}
        </span>
        <span className="h-px w-8 bg-gold/60" />
      </div>
      <p className="text-[0.65rem] uppercase tracking-luxury text-muted-foreground/70">
        Made with Simvites
      </p>
    </footer>
  )
}
