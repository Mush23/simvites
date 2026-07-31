// The printable invitation — ported from the original wedding site's
// beloved jsPDF keepsake. One A4 page in the stationery voice: ivory
// ground, double gold border, monogram, serif names, ONLY this
// household's events (evenly distributed), venues hyperlinked to Maps,
// and a QR that opens their personal invitation link. Client-only;
// import dynamically.

import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

export interface InviteEvent {
  name: string
  /** Pre-formatted, e.g. "Friday 18 September · 7:00 PM" (or "Date to follow"). */
  dateText: string
  venue: string | null
  address: string | null
  dressCode: string | null
  /** Event accent hex (#RRGGBB); falls back to brass. */
  accent: string | null
}

const CREAM: [number, number, number] = [246, 241, 233]
const INK: [number, number, number] = [33, 29, 24]
const BRASS: [number, number, number] = [151, 117, 63]
const DEEP: [number, number, number] = [70, 58, 42]

function hexToRgb(hex: string | null): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '')
  if (!m) return BRASS
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export async function downloadInvitePdf(opts: {
  siteTitle: string
  /** Brand-kit initials, e.g. "A·D". */
  initials: string
  householdName: string
  events: InviteEvent[]
  inviteUrl: string
  /** e.g. "15 July 2026" — printed as "Kindly respond by …". */
  deadlineText?: string | null
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const H = 297
  const CX = W / 2
  const CW = 146 // wrap width for centred text

  doc.setFillColor(...CREAM)
  doc.rect(0, 0, W, H, 'F')
  // Double gold border — the original's ornament, drawn instead of shipped.
  doc.setDrawColor(...BRASS)
  doc.setLineWidth(0.7)
  doc.rect(10, 10, W - 20, H - 20)
  doc.setLineWidth(0.3)
  doc.rect(12.5, 12.5, W - 25, H - 25)

  const centered = (text: string, y: number, extra?: { charSpace?: number }) =>
    doc.text(text, CX, y, { align: 'center', ...extra })
  const rule = (yCenter: number, widthMM: number) => {
    doc.setDrawColor(...BRASS)
    doc.setLineWidth(0.4)
    doc.line(CX - widthMM / 2, yCenter, CX + widthMM / 2, yCenter)
  }

  // ── Header: monogram circle · names · "requests the pleasure" · household ──
  doc.setDrawColor(...BRASS)
  doc.setLineWidth(0.5)
  doc.circle(CX, 36, 9, 'S')
  doc.setFont('times', 'italic')
  doc.setFontSize(13)
  doc.setTextColor(...BRASS)
  centered(opts.initials, 37.6)

  doc.setFont('times', 'italic')
  doc.setFontSize(34)
  doc.setTextColor(...BRASS)
  centered(opts.siteTitle, 62)
  rule(70, 46)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...DEEP)
  centered('R E Q U E S T   T H E   P L E A S U R E   O F   Y O U R   C O M P A N Y', 78)

  const y = 89
  doc.setFont('times', 'italic')
  doc.setFontSize(17)
  doc.setTextColor(...INK)
  centered(opts.householdName, y)
  const nameW = doc.getTextWidth(opts.householdName)
  const inner = nameW / 2 + 5
  doc.setDrawColor(...BRASS)
  doc.setLineWidth(0.4)
  doc.line(CX - inner - 11, y - 2, CX - inner, y - 2)
  doc.line(CX + inner, y - 2, CX + inner + 11, y - 2)
  const headerEnd = y + 4.5

  // ── Measure event blocks so they distribute evenly, never crowding.
  //    A crowded page (6+ events, long addresses) switches to compact
  //    metrics rather than overrunning the footer script and QR. ──
  const NORMAL = { name: 14, meta: 8.5, venue: 9.5, lineH: 4, pad: 12, dress: 4 }
  const COMPACT = { name: 11.5, meta: 7.5, venue: 8.5, lineH: 3.4, pad: 9.2, dress: 3.4 }
  const footerTop = 196
  const regionH = footerTop - headerEnd

  const measure = (m: typeof NORMAL) =>
    opts.events.map((e) => {
      doc.setFont('times', 'normal')
      doc.setFontSize(m.venue)
      const venueLine = [e.venue, e.address].filter(Boolean).join('  ·  ')
      const venueAddr = venueLine ? (doc.splitTextToSize(venueLine, CW) as string[]) : []
      const h = m.pad + venueAddr.length * (m.lineH + 0.4) + (e.dressCode ? m.dress : 0)
      return { e, venueAddr, h }
    })

  let metrics = NORMAL
  let blocks = measure(NORMAL)
  let totalBlocks = blocks.reduce((s, b) => s + b.h, 0)
  if (totalBlocks + (blocks.length + 1) * 2.5 > regionH) {
    metrics = COMPACT
    blocks = measure(COMPACT)
    totalBlocks = blocks.reduce((s, b) => s + b.h, 0)
  }

  // ── Footer: script line · QR · deadline ──
  doc.setFont('times', 'italic')
  doc.setFontSize(15)
  doc.setTextColor(...BRASS)
  centered('We can’t wait to celebrate with you.', 204)

  const qr = await QRCode.toDataURL(opts.inviteUrl, {
    margin: 1, width: 320, color: { dark: '#211D18', light: '#F6F1E9' },
  })
  const qs = 20
  const qy = 212
  doc.addImage(qr, 'PNG', CX - qs / 2, qy, qs, qs)
  doc.link(CX - qs / 2, qy, qs, qs, { url: opts.inviteUrl })
  doc.setFont('times', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(...DEEP)
  centered('Scan to open your invitation and RSVP', qy + qs + 4.5)
  doc.link(CX - 30, qy + qs + 1, 60, 5, { url: opts.inviteUrl })
  if (opts.deadlineText) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...DEEP)
    centered(`Kindly respond by ${opts.deadlineText}`, qy + qs + 10)
  }

  // ── Events: even gaps between header and footer ──
  let gap = (regionH - totalBlocks) / (blocks.length + 1)
  if (gap < 2) gap = 2
  let top = headerEnd + gap
  for (const b of blocks) {
    const accent = hexToRgb(b.e.accent)
    let ty = top + metrics.pad * 0.38
    doc.setFont('times', 'bold')
    doc.setFontSize(metrics.name)
    doc.setTextColor(...INK)
    centered(b.e.name, ty)
    ty += metrics.lineH + 0.4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(metrics.meta)
    doc.setTextColor(accent[0], accent[1], accent[2])
    centered(b.e.dateText, ty)
    ty += metrics.lineH + 0.2
    doc.setFont('times', 'normal')
    doc.setFontSize(metrics.venue)
    doc.setTextColor(...DEEP)
    const vTop = ty
    let vMaxW = 0
    b.venueAddr.forEach((ln) => {
      vMaxW = Math.max(vMaxW, doc.getTextWidth(ln))
      centered(ln, ty)
      ty += metrics.lineH
    })
    if (b.venueAddr.length) {
      const q = encodeURIComponent([b.e.venue, b.e.address].filter(Boolean).join(' '))
      doc.link(CX - vMaxW / 2, vTop - 3.2, vMaxW, ty - vTop, { url: `https://maps.google.com/?q=${q}` })
    }
    if (b.e.dressCode) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(metrics.meta - 1)
      doc.setTextColor(...BRASS)
      centered(`Dress · ${b.e.dressCode}`, ty)
      ty += metrics.dress
    }
    top += b.h + gap
  }

  doc.save(`invitation-${opts.householdName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`)
}
