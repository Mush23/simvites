import { PageHeader } from '@/components/app/ui'

export const metadata = { title: 'Reports · Occasio' }

const REPORTS = [
  { href: '/guests/export', title: 'Guest list', body: 'Every household and guest, with emails, children and plus-ones.' },
  { href: '/rsvps/export', title: 'RSVPs by event', body: 'Guest × event × status, with a column for every question — the caterer sheet.' },
  { href: '/budget/export', title: 'Budget', body: 'Every line with estimate, actual, paid and balance, linked to events and vendors.' },
  { href: '/vendors/export', title: 'Vendors', body: 'The full pipeline with quotes, contracts, contacts and event coverage.' },
  { href: '/tasks/export', title: 'Tasks', body: 'The whole checklist with status, priority, due dates and links.' },
]

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-[1060px] px-6 py-10">
      <PageHeader
        eyebrow="Reports"
        title="Exports hosts trust"
        description="One-click CSVs — open in Excel or Google Sheets, or hand straight to a vendor."
      />
      <div className="grid gap-5 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <a key={r.href} href={r.href}
            className="rounded-card border border-line bg-surface p-6 shadow-card transition-transform hover:-translate-y-0.5">
            <p className="font-display text-2xl text-ink">{r.title}</p>
            <p className="mt-2 text-sm text-ink-2">{r.body}</p>
            <p className="eyebrow mt-4 text-accent-ink">Download CSV →</p>
          </a>
        ))}
      </div>
    </div>
  )
}
