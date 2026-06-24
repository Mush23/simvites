import { Reveal } from './reveal'
import { SectionHeading } from './section-heading'

export interface StoryProps {
  kicker?: string
  title?: string
  paragraphs: string[]
}

export function Story({
  kicker = 'Our Story',
  title = 'How we got here',
  paragraphs,
}: StoryProps) {
  return (
    <section id="story" className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
      <Reveal>
        <SectionHeading kicker={kicker} title={title} />
      </Reveal>
      <Reveal className="mt-12 space-y-6">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className="text-center text-lg leading-relaxed text-muted-foreground"
          >
            {p}
          </p>
        ))}
      </Reveal>
    </section>
  )
}
