/**
 * Guest-list normalisation, in one place.
 *
 * C2 (click-through): `importGuests` already deduped correctly — keyed on
 * `household_id:lower(full_name)`, skipping repeats and reporting how many it
 * skipped — but `addGuest` had no check at all. So the product's own rule
 * applied when you pasted a spreadsheet and not when you typed a name, and the
 * same person added twice became two guests with no warning. Duplicates are the
 * commonest guest-list data problem and they land straight in the headcount the
 * caterer is quoted from.
 *
 * Emails were also stored exactly as typed, so `Chidi@Example.COM` and
 * `chidi@example.com` were different strings to every `Set`-based dedupe in the
 * send paths — meaning one person could be mailed twice.
 */

/** Lowercase + trim; null for empty. Addresses are case-insensitive in practice. */
export function normaliseEmail(value: string | null | undefined): string | null {
  const v = (value ?? '').trim().toLowerCase()
  return v === '' ? null : v
}

/**
 * Identity of a guest WITHIN a household. Two people with the same name in one
 * household is a mistake; the same name in two households (two John Smiths at
 * one wedding) is ordinary, so the household is part of the key.
 */
export function guestKey(householdId: string, fullName: string): string {
  return `${householdId}:${fullName.trim().toLowerCase()}`
}

/**
 * Unique addresses, case-insensitively, preserving first-seen spelling.
 *
 * Note what this deliberately does NOT do: it never treats a shared address as
 * an error. A couple with one inbox is normal at a wedding, so two guests may
 * legitimately share an email — they just must not be mailed twice.
 */
export function dedupeEmails(emails: (string | null | undefined)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of emails) {
    const key = normaliseEmail(raw)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(raw!.trim())
  }
  return out
}
