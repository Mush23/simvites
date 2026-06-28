import { PageHeader, ComingSoon } from '@/components/app/ui'

export default function Page() {
  return (
    <div className="mx-auto max-w-[1060px] px-6 py-10">
      <PageHeader eyebrow="RSVPs" title="RSVPs" description="Track who's coming, per event." />
      <ComingSoon phase="Phase 1C">Built in Phase 1C.</ComingSoon>
    </div>
  )
}
