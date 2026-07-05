import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTemplate, TEMPLATES } from '@/lib/templates/registry'
import { TemplatePreview } from '@/components/templates/template-preview'
import { BRAND_NAME } from '@/lib/brand'

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ template: t.key }))
}

export async function generateMetadata({ params }: { params: Promise<{ template: string }> }) {
  const { template } = await params
  const t = TEMPLATES.find((x) => x.key === template)
  return { title: t ? `${t.name} · ${BRAND_NAME}` : 'Template' }
}

// Full single-template preview with the couple-facing look front and centre.
export default async function TemplateDetailPage({ params }: { params: Promise<{ template: string }> }) {
  const { template } = await params
  const t = TEMPLATES.find((x) => x.key === template)
  if (!t) notFound()
  const full = getTemplate(t.key)

  return (
    <div className="min-h-screen bg-paper px-6 py-12 text-ink">
      <div className="mx-auto max-w-[560px]">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/preview" className="text-[13px] font-medium text-ink-2 hover:text-ink">← All templates</Link>
          <Link href="/login" className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white">Use this template</Link>
        </div>
        <TemplatePreview template={full} />
        <div className="mt-6 text-center">
          <h1 className="font-display text-2xl text-ink">{t.name}</h1>
          <p className="mx-auto mt-2 max-w-md text-[13.5px] text-ink-2">{t.description}</p>
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {t.swatches.map((c) => <span key={c} className="h-4 w-4 rounded-full border border-line" style={{ background: c }} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
