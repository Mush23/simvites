'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { Puck } from '@puckeditor/core'
import '@puckeditor/core/puck.css'
import { puckConfig, type SimvitesData } from '@/lib/puck/config'
import type { EventRecord } from '@/lib/types'
import { siteUrl } from '@/lib/tenant'
import { saveDraft, saveAndPublish } from '../actions'

type Status = 'idle' | 'saving' | 'saved' | 'publishing' | 'published' | 'error'

export function SiteEditor({
  siteId,
  siteName,
  slug,
  status: siteStatus,
  data,
  events,
}: {
  siteId: string
  siteName: string
  slug: string
  status: string
  data: SimvitesData
  events: EventRecord[]
}) {
  const [status, setStatus] = useState<Status>('idle')
  const [published, setPublished] = useState(siteStatus === 'published')
  const latest = useRef<SimvitesData>(data)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced draft autosave so edits aren't lost on navigation.
  const onChange = useCallback((next: SimvitesData) => {
    latest.current = next
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setStatus('saving')
      const res = await saveDraft(siteId, latest.current)
      setStatus(res.error ? 'error' : 'saved')
    }, 1200)
  }, [siteId])

  const onPublish = useCallback(
    async (next: SimvitesData) => {
      setStatus('publishing')
      const res = await saveAndPublish(siteId, next)
      if ('error' in res && res.error) {
        setStatus('error')
      } else {
        setPublished(true)
        setStatus('published')
      }
    },
    [siteId],
  )

  const publishNow = useCallback(() => onPublish(latest.current), [onPublish])

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col">
      <div className="flex items-center justify-between border-b border-border bg-background px-5 py-2.5">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-[0.7rem] uppercase tracking-wide-soft text-muted-foreground hover:text-gold-ink"
          >
            ← Sites
          </Link>
          <span className="font-heading text-lg">{siteName}</span>
          <StatusPill status={status} />
        </div>
        <div className="flex items-center gap-4">
          {published && (
            <a
              href={siteUrl(slug)}
              target="_blank"
              rel="noreferrer"
              className="text-[0.7rem] uppercase tracking-wide-soft text-gold-ink underline underline-offset-4"
            >
              View live →
            </a>
          )}
          <button
            id="publish-site"
            type="button"
            onClick={publishNow}
            disabled={status === 'publishing'}
            className="rounded-full bg-primary px-5 py-2 text-[0.7rem] uppercase tracking-wide-soft text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === 'publishing' ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <Puck
          config={puckConfig}
          data={data}
          metadata={{ events }}
          onChange={onChange}
          onPublish={onPublish}
        />
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    idle: '',
    saving: 'Saving…',
    saved: 'Draft saved',
    publishing: 'Publishing…',
    published: 'Published ✓',
    error: 'Save failed',
  }
  if (!map[status]) return null
  return (
    <span className="text-[0.65rem] uppercase tracking-wide-soft text-muted-foreground">
      {map[status]}
    </span>
  )
}
