import Image from 'next/image'

export interface HeroProps {
  kicker?: string // "Together with their families"
  titleLeft: string // "Maharshi"
  titleRight: string // "Simran"
  dateDisplay: string
  location: string
  heroImage: string
  guestName?: string // personalised greeting when a token resolves
  ctaHref?: string
  ctaLabel?: string
}

export function Hero({
  kicker = 'Together with their families',
  titleLeft,
  titleRight,
  dateDisplay,
  location,
  heroImage,
  guestName,
  ctaHref = '#rsvp',
  ctaLabel = 'View Your Invitation',
}: HeroProps) {
  const showGuest = guestName && guestName !== 'Our Guest'

  return (
    <section
      id="top"
      className="relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-black"
    >
      <Image
        src={heroImage}
        alt={`${titleLeft} & ${titleRight}`}
        fill
        priority
        sizes="100vw"
        className="kenburns object-cover object-top"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/75" />

      <div className="hero-enter relative flex h-full flex-col items-center justify-end px-6 pb-24 text-center text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.55)] sm:justify-center sm:pb-0">
        <p className="mb-5 text-[0.7rem] uppercase tracking-luxury text-white/85">
          {kicker}
        </p>
        <h1 className="font-heading text-6xl font-light leading-[0.95] sm:text-7xl md:text-8xl">
          {titleLeft}
          <span className="mx-3 inline-block align-middle text-gold sm:mx-5">&amp;</span>
          {titleRight}
        </h1>
        <div className="my-7 flex items-center gap-4">
          <span className="h-px w-10 bg-gold/70" />
          <p className="text-xs uppercase tracking-wide-soft text-white/90">{dateDisplay}</p>
          <span className="h-px w-10 bg-gold/70" />
        </div>
        <p className="text-sm uppercase tracking-wide-soft text-white/85">{location}</p>

        <div className="mt-8 flex flex-col items-center gap-3">
          {showGuest && (
            <p className="rounded-full border border-white/30 px-5 py-2 text-[0.65rem] uppercase tracking-wide-soft text-white/90 backdrop-blur-sm">
              Welcome, {guestName}
            </p>
          )}
          <a
            href={ctaHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gold bg-gold/10 px-6 py-3 text-[0.65rem] uppercase tracking-wide-soft text-gold ring-1 ring-gold/30 ring-offset-2 ring-offset-transparent backdrop-blur-sm transition-colors hover:bg-gold hover:text-primary"
          >
            {ctaLabel}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </a>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 sm:hidden">
        <span className="text-[0.6rem] uppercase tracking-luxury text-white/70">Scroll</span>
      </div>
    </section>
  )
}
