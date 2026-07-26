'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { notify } from '@/components/ui/overlays'
import { TemplateGallery } from '@/components/templates/template-gallery'
import type { TemplateManifest } from '@/lib/templates/manifest'
import { applyTemplate } from './actions'

// Thin client shell: the gallery needs an onUse callback, and a server
// component cannot hand a function across the boundary. Everything expensive —
// the eighteen real template renders in `thumbs` — is already server-rendered
// and simply passes through.

export function TemplatesClient({
  templates,
  thumbs,
  appliedKey,
}: {
  templates: TemplateManifest[]
  thumbs: React.ReactNode[]
  appliedKey: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  async function onUse(key: string) {
    const name = templates.find((t) => t.id === key)?.name ?? 'Template'
    const fd = new FormData()
    fd.set('template', key)
    const res = await applyTemplate(fd)
    if (res?.error) { notify(res.error, { tone: 'warn' }); return }
    notify(`${name} applied — publish when you're ready to make it live`)
    startTransition(() => router.refresh())
  }

  return (
    <TemplateGallery
      templates={templates}
      thumbs={thumbs}
      appliedKey={appliedKey}
      onUse={onUse}
      seeded
    />
  )
}
