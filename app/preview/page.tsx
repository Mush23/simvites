import Link from 'next/link'
import { MANIFESTS } from '@/lib/templates/manifest'
import { TemplateRender } from '@/components/templates/template-render'
import { ScaleToFit } from '@/components/templates/scale-to-fit'
import { DEMO_SEED } from '@/lib/templates/seed'
import { BRAND_NAME } from '@/lib/brand'
import { PreviewClient } from './preview-client'

export const metadata = { title: `Templates · ${BRAND_NAME}` }

// Public template gallery — the same components the in-app gallery and the
// published site use, seeded with the demo wedding instead of a couple's own.
// Browsing here should feel identical to browsing once signed in, because it is
// the same code.

export default function TemplateGalleryPage() {
  const thumbs = MANIFESTS.map((m) => (
    <ScaleToFit key={m.id} ratio={m.aspect[0] / m.aspect[1]}>
      <TemplateRender templateKey={m.id} seed={DEMO_SEED} truncate={3} />
    </ScaleToFit>
  ))

  return (
    <div className="min-h-screen bg-paper px-6 py-14 text-ink">
      <div className="mx-auto max-w-[1240px]">
        <header className="mb-10 text-center">
          <Link href="/" className="text-[13px] font-semibold tracking-tight">{BRAND_NAME}</Link>
          <h1 className="mt-4 text-[clamp(28px,4vw,44px)] font-[650] tracking-[-0.03em]">
            <span className="nums">{MANIFESTS.length}</span> looks, one wedding
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[14px] text-ink-2">
            Every template brings its own typography, palette and detailing — not just a colour
            swap. Preview any of them full-size, on desktop, tablet or phone.
          </p>
        </header>

        <PreviewClient templates={MANIFESTS} thumbs={thumbs} />

        <div className="mt-12 text-center">
          <Link href="/login"
            className="inline-block rounded-[10px] bg-accent px-6 py-3 text-[14px] font-semibold text-white">
            Start building free
          </Link>
        </div>
      </div>
    </div>
  )
}
