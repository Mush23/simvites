import { notFound } from 'next/navigation'
import { TEMPLATES } from '@/lib/templates/registry'
import { TemplateRender } from '@/components/templates/template-render'
import { DEMO_SEED } from '@/lib/templates/seed'
import { coupleSeed } from '@/lib/templates/couple-seed'

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ template: t.key }))
}

// Chrome-free full-page render, for the preview shell's <iframe>.
//
// This route exists because device toggles are otherwise meaningless: media
// queries key off the frame's OWN width, not a CSS transform on a scaled
// element. A 390px-wide scaled-down desktop render is a desktop layout that
// happens to be small; a 390px-wide iframe is the mobile layout. Only one of
// those tells a couple what their guests will see on a phone.
//
// `?seeded=1` swaps the demo wedding for the signed-in couple's own record.

export default async function TemplateFramePage({
  params,
  searchParams,
}: {
  params: Promise<{ template: string }>
  searchParams: Promise<{ seeded?: string }>
}) {
  const { template } = await params
  const { seeded } = await searchParams
  if (!TEMPLATES.some((t) => t.key === template)) notFound()

  const seed = seeded === '1' ? (await coupleSeed()) ?? DEMO_SEED : DEMO_SEED

  return <TemplateRender templateKey={template} seed={seed} fullHeight />
}
