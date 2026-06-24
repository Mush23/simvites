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
export function formatEventDate(iso?: string | null): string | undefined {
  if (!iso) return undefined
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}
