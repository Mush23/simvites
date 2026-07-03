import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind class names, resolving conflicts (last wins). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format an ISO date (e.g. "2026-10-24") for display, e.g.
 * "Saturday, 24 October 2026". Returns undefined for empty input and echoes
 * non-ISO strings unchanged.
 */
/** Format a timestamptz for display, e.g. "Sat 19 Sep 2026 · 10:30". */
export function formatEventDateTime(iso?: string | null): string | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return undefined
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d).replace(',', ' ·')
}

