'use client'

// Print / save-as-PDF for the public save-the-date. The print stylesheet
// (in the layout) hides everything but the card, so "Save as PDF" or "Save
// as image" from the browser print dialog yields a clean keepsake.

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()}
      className="no-print rounded-lg bg-[#211D18] px-5 py-2.5 text-[13px] font-semibold text-white">
      Save as image or PDF
    </button>
  )
}
