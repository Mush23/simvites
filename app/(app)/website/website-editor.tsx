'use client'

import { useCallback, useRef, useState } from 'react'
import { Puck } from '@puckeditor/core'
import '@puckeditor/core/puck.css'
import { siteConfig, type SiteData } from '@/lib/puck/config'
import type { SiteEvent } from '@/components/site/blocks'
import { savePageDraft, saveAndPublish } from './actions'

type Status = 'idle' | 'saving' | 'saved' | 'publishing' | 'published' | 'error'

export function WebsiteEditor({
  siteId, pageId, slug, data, events, published,
}: {
  siteId: string; pageId: string; slug: string; data: SiteData; events: SiteEvent[]; published: boolean
}) {
  const [status, setStatus] = useState<Status>('idle')
  const [isPublished, setIsPublished] = useState(published)
  const latest = useRef<SiteData>(data)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onChange = useCallback((next: SiteData) => {
    latest.current = next
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setStatus('saving')
      const res = await savePageDraft(pageId, latest.current)
      setStatus('error' in res && res.error ? 'error' : 'saved')
    }, 1200)
  }, [pageId])

  const publish = useCallback(async () => {
    setStatus('publishing')
    const res = await saveAndPublish(siteId, pageId, latest.current)
    if ('error' in res && res.error) setStatus('error')
    else { setIsPublished(true); setStatus('published') }
  }, [siteId, pageId])

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col">
      <div className="flex items-center justify-between border-b border-line bg-paper px-5 py-2.5">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg text-ink">Website</span>
          <StatusPill status={status} />
        </div>
        <div className="flex items-center gap-4">
          {isPublished && (
            <a href={`/s/${slug}`} target="_blank" rel="noreferrer"
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-ink underline underline-offset-4">
              View site →
            </a>
          )}
          <button id="publish-site" type="button" onClick={publish} disabled={status === 'publishing'}
            className="rounded-md bg-accent px-5 py-2 font-semibold text-white transition-transform hover:-translate-y-px disabled:opacity-50">
            {status === 'publishing' ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <Puck config={siteConfig} data={data} metadata={{ events }} onChange={onChange} onPublish={publish} />
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    idle: '', saving: 'Saving…', saved: 'Draft saved', publishing: 'Publishing…', published: 'Published ✓', error: 'Save failed',
  }
  if (!map[status]) return null
  return <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{map[status]}</span>
}
