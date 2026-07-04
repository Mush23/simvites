// RSVP confirmation PDF + QR — the wedding site's beloved keepsake, ported.
// Client-only; import dynamically from the confirmation screen.

import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

export interface PdfLine {
  guest: string
  events: { name: string; status: 'attending' | 'declined' }[]
}

export async function downloadRsvpPdf(opts: {
  siteTitle: string
  householdName: string
  lines: PdfLine[]
  siteUrl: string
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' })
  const W = doc.internal.pageSize.getWidth()
  const cream: [number, number, number] = [246, 241, 233]
  const ink: [number, number, number] = [33, 29, 24]
  const brass: [number, number, number] = [151, 117, 63]

  doc.setFillColor(...cream)
  doc.rect(0, 0, W, doc.internal.pageSize.getHeight(), 'F')

  let y = 22
  doc.setTextColor(...brass)
  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  doc.text(opts.siteTitle.toUpperCase(), W / 2, y, { align: 'center', charSpace: 1.5 })

  y += 12
  doc.setTextColor(...ink)
  doc.setFontSize(24)
  doc.text('RSVP Confirmation', W / 2, y, { align: 'center' })

  y += 8
  doc.setFontSize(11)
  doc.text(opts.householdName, W / 2, y, { align: 'center' })

  y += 6
  doc.setDrawColor(...brass)
  doc.setLineWidth(0.3)
  doc.line(W / 2 - 18, y, W / 2 + 18, y)

  y += 10
  doc.setFontSize(10)
  for (const line of opts.lines) {
    doc.setFont('times', 'bold')
    doc.text(line.guest, 18, y)
    doc.setFont('times', 'normal')
    y += 5.5
    for (const ev of line.events) {
      doc.setTextColor(...(ev.status === 'attending' ? brass : ink))
      doc.text(`${ev.status === 'attending' ? '✓' : '—'}  ${ev.name}`, 22, y)
      doc.setTextColor(...ink)
      y += 5
    }
    y += 3
  }

  // QR back to the site (reopen / edit before the deadline).
  const qr = await QRCode.toDataURL(opts.siteUrl, { margin: 1, width: 240, color: { dark: '#211D18', light: '#F6F1E9' } })
  doc.addImage(qr, 'PNG', W / 2 - 14, y + 2, 28, 28)
  doc.setFontSize(8)
  doc.setTextColor(...brass)
  doc.text('Scan to revisit or update your RSVP', W / 2, y + 35, { align: 'center' })

  doc.save(`rsvp-${opts.householdName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`)
}
