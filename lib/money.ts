// Money is stored as integer minor units (pence) — never floats (handoff §2).

/** 123456 → "£1,234.56" (empty for null/undefined). */
export function formatPence(pence: number | null | undefined): string {
  if (pence == null) return ''
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100)
}

/** "1,234.56" | "£1234" | "1234.5" → pence (null for empty/invalid). */
export function parsePounds(input: string | null | undefined): number | null {
  if (!input) return null
  const cleaned = input.replace(/[£,\s]/g, '')
  if (!cleaned || !/^\d*\.?\d{0,2}$/.test(cleaned)) return null
  const n = Number.parseFloat(cleaned)
  if (Number.isNaN(n)) return null
  return Math.round(n * 100)
}
