// Colour conversion for contexts that cannot parse modern CSS colour syntax.
//
// Specifically: Satori, the renderer behind next/og's ImageResponse, throws
// `Unexpected token type: function` on `oklch(...)`. Several template themes
// declare --paper/--ink in oklch, so any generated image drawn in a template's
// own colours has to resolve them first.

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

/** Linear-light channel → 8-bit sRGB. */
function encode(c: number): number {
  const s = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  return Math.round(clamp01(s) * 255)
}

const hex2 = (n: number) => n.toString(16).padStart(2, '0')

/**
 * oklch(L C H [/ alpha]) → #rrggbb, via OKLab and linear sRGB (Ottosson).
 * Alpha is dropped: these are opaque backgrounds and foregrounds.
 * Returns null if the string is not oklch, so callers can pass through.
 */
export function oklchToHex(value: string): string | null {
  const m = /^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:deg)?\s*(?:\/.*)?\)$/i.exec(value.trim())
  if (!m) return null

  const pct = (s: string, scale: number) =>
    s.endsWith('%') ? (parseFloat(s) / 100) * scale : parseFloat(s)

  const L = pct(m[1], 1)
  // A percentage chroma is relative to 0.4 in the CSS spec.
  const C = pct(m[2], 0.4)
  const h = (parseFloat(m[3]) * Math.PI) / 180
  if (!Number.isFinite(L) || !Number.isFinite(C) || !Number.isFinite(h)) return null

  const a = C * Math.cos(h)
  const b = C * Math.sin(h)

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b
  const l = l_ * l_ * l_
  const mm = m_ * m_ * m_
  const s = s_ * s_ * s_

  const r = 4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s
  const bl = -0.0041960863 * l - 0.7034186147 * mm + 1.7076147010 * s

  return `#${hex2(encode(r))}${hex2(encode(g))}${hex2(encode(bl))}`
}

/**
 * Best-effort colour for a Satori style: hex passes through, oklch converts,
 * anything else (color-mix, var(), named colours it may not know) falls back.
 */
export function toStaticHex(value: string | undefined, fallback: string): string {
  if (!value) return fallback
  const v = value.trim()
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return v
  return oklchToHex(v) ?? fallback
}
