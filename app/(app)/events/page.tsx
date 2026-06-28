import { PageHeader, ComingSoon } from '@/components/app/ui'

export default function Page() {
  return (
    <div className="mx-auto max-w-[1060px] px-6 py-10">
      <PageHeader eyebrow="Events" title="Events" description="Every ceremony and celebration — the spine the whole product reuses." />
      <ComingSoon phase="Phase 1B">Built in Phase 1B.</ComingSoon>
    </div>
  )
}
