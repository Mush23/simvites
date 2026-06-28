import { PageHeader, ComingSoon } from '@/components/app/ui'

export default function Page() {
  return (
    <div className="mx-auto max-w-[1060px] px-6 py-10">
      <PageHeader eyebrow="Settings" title="Settings" description="Site labels, theme, collaborators and billing." />
      <ComingSoon phase="Phase 1E">Built in Phase 1E.</ComingSoon>
    </div>
  )
}
