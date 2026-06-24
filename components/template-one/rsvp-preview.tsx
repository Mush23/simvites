import { Reveal } from './reveal'
import { SectionHeading } from './section-heading'

/**
 * RSVP section for Template #1. The full per-event / per-guest RSVP engine
 * (capacity caps, disappearing events, non-destructive history) lands in a
 * later sprint and renders here behind a guest's personalised token. For now
 * this is the premium entry point.
 */
export function RsvpPreview({
  deadlineDisplay,
}: {
  deadlineDisplay?: string
}) {
  return (
    <section id="rsvp" className="bg-secondary/40 py-24 sm:py-32">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <Reveal>
          <SectionHeading kicker="Kindly Respond" title="RSVP" />
        </Reveal>
        <Reveal className="mt-10">
          <p className="text-lg leading-relaxed text-muted-foreground">
            We can&apos;t wait to celebrate with you. Open your personalised
            invitation to let us know which events you&apos;ll be joining.
          </p>
          {deadlineDisplay && (
            <p className="mt-6 text-[0.7rem] uppercase tracking-wide-soft text-gold-ink">
              Please respond by {deadlineDisplay}
            </p>
          )}
          <a
            href="#top"
            className="mt-10 inline-flex min-h-11 items-center gap-2 rounded-full border border-gold bg-gold/10 px-8 py-3 text-[0.7rem] uppercase tracking-wide-soft text-gold-ink ring-1 ring-gold/30 transition-colors hover:bg-gold hover:text-primary-foreground"
          >
            Open Your Invitation
          </a>
        </Reveal>
      </div>
    </section>
  )
}
