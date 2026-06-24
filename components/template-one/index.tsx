import type { Site } from '@/lib/types'
import { SiteNav } from './site-nav'
import { Hero } from './hero'
import { Story } from './story'
import { Events } from './events'
import { Schedule } from './schedule'
import { RsvpPreview } from './rsvp-preview'
import { Footer } from './footer'
import { ThemeStyle } from './theme-style'

/** Extra render-time content for Template #1 not stored on the Site record. */
export interface TemplateOneContent {
  kicker?: string
  titleLeft: string
  titleRight: string
  coupleInitials: string
  dateDisplay: string
  location: string
  heroImage: string
  story: { kicker?: string; title?: string; paragraphs: string[] }
  rsvpDeadlineDisplay?: string
}

/**
 * Template #1 — the ported wedding design, rendered from a resolved Site plus
 * its page content. The same renderer drives the Puck editor preview and the
 * live published site.
 */
export function TemplateOne({
  site,
  content,
  guestName,
}: {
  site: Site
  content: TemplateOneContent
  guestName?: string
}) {
  return (
    <div data-site-root className="min-h-screen bg-background text-foreground">
      <ThemeStyle theme={site.theme} />
      <SiteNav coupleInitials={content.coupleInitials} />

      <main>
        <Hero
          kicker={content.kicker}
          titleLeft={content.titleLeft}
          titleRight={content.titleRight}
          dateDisplay={content.dateDisplay}
          location={content.location}
          heroImage={content.heroImage}
          guestName={guestName}
        />
        <Story
          kicker={content.story.kicker}
          title={content.story.title}
          paragraphs={content.story.paragraphs}
        />
        <Events events={site.events} />
        <Schedule events={site.events} />
        <RsvpPreview deadlineDisplay={content.rsvpDeadlineDisplay} />
      </main>

      <Footer
        coupleInitials={content.coupleInitials}
        dateDisplay={content.dateDisplay}
      />
    </div>
  )
}
