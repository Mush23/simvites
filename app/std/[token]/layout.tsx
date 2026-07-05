import { templateFontClasses } from '@/lib/template-fonts'

// Public save-the-date layout: loads the template font pool and a print
// stylesheet so "Save as PDF/image" prints only the card.
export default function StdLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={templateFontClasses}>
      {children}
      <style>{`
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          main { min-height: 0 !important; padding: 0 !important; background: #fff !important; }
          [data-print-target] { max-width: none !important; width: 100% !important; }
          [data-std-card] { border: none !important; border-radius: 0 !important; }
        }
      `}</style>
    </div>
  )
}
