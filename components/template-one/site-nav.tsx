'use client'

import { useEffect, useState } from 'react'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '#story', label: 'Story' },
  { href: '#events', label: 'Events' },
  { href: '#schedule', label: 'Schedule' },
  { href: '#rsvp', label: 'RSVP' },
]

export function SiteNav({ coupleInitials }: { coupleInitials: string }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        scrolled
          ? 'border-b border-border/60 bg-background/80 backdrop-blur-md'
          : 'border-b border-transparent',
      )}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
        <a
          href="#top"
          className="font-heading text-lg tracking-wide-soft text-foreground"
          aria-label="Back to top"
        >
          {coupleInitials}
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[0.7rem] uppercase tracking-wide-soft text-muted-foreground transition-colors hover:text-gold-ink"
            >
              {l.label}
            </a>
          ))}
        </div>

        <ThemeToggle />
      </nav>
    </header>
  )
}
