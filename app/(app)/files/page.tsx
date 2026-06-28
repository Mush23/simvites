import { PageHeader, ComingSoon } from '@/components/app/ui'

export default function Page() {
  return (
    <div className="mx-auto max-w-[1060px] px-6 py-10">
      <PageHeader eyebrow="Files" title="Files" description="Contracts, quotes and documents, linked where they belong." />
      <ComingSoon phase="Phase 1D">Built in Phase 1D.</ComingSoon>
    </div>
  )
}
