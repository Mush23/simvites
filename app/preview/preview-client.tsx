'use client'

import { useRouter } from 'next/navigation'
import { TemplateGallery } from '@/components/templates/template-gallery'
import type { TemplateManifest } from '@/lib/templates/manifest'

// Marketing gallery shell. "Use this" here means "start a site with this look",
// so it routes to sign-up carrying the choice rather than applying anything —
// there is no site to apply to yet.

export function PreviewClient({
  templates,
  thumbs,
}: {
  templates: TemplateManifest[]
  thumbs: React.ReactNode[]
}) {
  const router = useRouter()
  return (
    <TemplateGallery
      templates={templates}
      thumbs={thumbs}
      onUse={(key) => router.push(`/login?template=${key}`)}
    />
  )
}
