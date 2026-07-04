'use client'

import { useCallback, useRef, useState } from 'react'
import { Puck } from '@puckeditor/core'
import '@puckeditor/core/puck.css'
import { siteConfig, type SiteData } from '@/lib/puck/config'
import type { SiteEvent } from '@/components/site/blocks'
import { savePageDraft, saveAndPublish, uploadSiteImage } from './actions'

/** Upload → URL copied to clipboard, ready to paste into any image field. */
function ImageUploader() {
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <label title="Upload a photo, then paste the copied link into any image field"
      className="cursor-pointer rounded-pill border border-line bg-paper-2 px-3.5 py-2 text-sm text-ink transition-colors hover:border-accent">
      {busy ? 'Uploading…' : note ?? 'Upload image'}
      <input type="file" accept="image/*" className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (!f) return
          setBusy(true); setNote(null)
          const fd = new FormData(); fd.set('file', f)
          const res = await uploadSiteImage(fd)
          setBusy(false)
          if (res.url) {
            try { await navigator.clipboard.writeText(res.url) } catch {}
            setNote('Link copied — paste it ✓')
            setTimeout(() => setNote(null), 4000)
          } else setNote(res.error ?? 'Failed')
          e.target.value = ''
        }} />
    </label>
  )
}

type Status = 'idle' | 'saving' | 'saved' | 'publishing' | 'published' | 'error' | 'locked'

export function WebsiteEditor({
  siteId, pageId, slug, data, events, published, templateName, templateVars,
}: {
  siteId: string; pageId: string; slug: string; data: SiteData; events: SiteEvent[]; published: boolean
  templateName: string; templateVars: Record<string, string>
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
    if ('locked' in res && res.locked) setStatus('locked')
    else if ('error' in res && res.error) setStatus('error')
    else { setIsPublished(true); setStatus('published') }
  }, [siteId, pageId])

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col">
      <div className="flex items-center justify-between border-b border-line bg-paper px-5 py-2.5">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg text-ink">Website</span>
          <span className="rounded-pill border border-line px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
            {templateName}
          </span>
          <StatusPill status={status} />
        </div>
        <div className="flex items-center gap-4">
          <ImageUploader />
          {status === 'locked' && (
            <a href="/settings" id="unlock-cta"
              className="rounded-md border border-accent-line bg-accent-soft px-3.5 py-2 text-sm text-accent-ink transition-colors hover:border-accent">
              Publishing is part of the unlock — see billing →
            </a>
          )}
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
      {/* iframe disabled + template vars on the wrapper = true WYSIWYG canvas */}
      <div className="min-h-0 flex-1" data-site-root style={templateVars as React.CSSProperties}>
        <Puck
          config={siteConfig}
          data={data}
          metadata={{ events }}
          onChange={onChange}
          onPublish={publish}
          iframe={{ enabled: false }}
        />
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    idle: '', saving: 'Saving…', saved: 'Draft saved', publishing: 'Publishing…',
    published: 'Published ✓', error: 'Save failed', locked: 'Draft saved — publish is locked',
  }
  if (!map[status]) return null
  return <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{map[status]}</span>
}
