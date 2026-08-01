/**
 * M7: `?next=` used to be concatenated onto the origin unvalidated, which is
 * an open redirect — the result is parsed as a URL, not as a path:
 *
 *   origin + "@evil.com"  →  https://simvites.co.uk@evil.com  →  host evil.com
 *
 * ("simvites.co.uk" is read as userinfo.) A leading tab does the same.
 *
 * Accept only a single-slash absolute path. Callers should still resolve the
 * result through `new URL(next, origin)` so the destination is provably
 * same-origin even if this function is ever loosened.
 *
 * Dependency-free so it can be unit-tested directly (scripts/test-misuse.mjs)
 * rather than duplicated in the test.
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw) return fallback
  // Must be rooted at a single "/" — rejects "@evil.com", "https://…",
  // protocol-relative "//host" and the "/\" backslash variant.
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  // Whitespace and control characters: some parsers strip these before
  // resolving, which can turn an apparently-safe path back into a host.
  // Written as a code-point scan so no literal control character has to
  // survive in source.
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i)
    if (c <= 0x20 || c === 0x7f) return fallback
  }
  return raw
}
