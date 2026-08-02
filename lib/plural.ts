/**
 * Count + correctly pluralised noun.
 *
 * C5: the guest list read "1 HOUSEHOLDS · 1 GUESTS". Small, but it is on the
 * screen a couple opens most, and the first household they add is exactly when
 * they see it — the moment the product should look most cared-for.
 *
 * Written as one helper rather than a ternary at each call site because there
 * were seven of them, and the eighth would have been wrong too.
 */
export function plural(n: number, singular: string, pluralForm?: string): string {
  return `${n} ${pluraliseWord(n, singular, pluralForm)}`
}

/** The noun alone, for when the number is rendered separately (e.g. styled). */
export function pluraliseWord(n: number, singular: string, pluralForm?: string): string {
  if (n === 1) return singular
  return pluralForm ?? `${singular}s`
}
