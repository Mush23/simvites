'use client'

import { useCallback, useRef, useState } from 'react'
import { Puck, createUsePuck, type Overrides } from '@puckeditor/core'
import '@puckeditor/core/puck.css'
import { siteConfig, type SiteData } from '@/lib/puck/config'
import type { SiteEvent } from '@/components/site/blocks'
import { useRouter } from 'next/navigation'
import { savePageDraft, saveAndPublish, uploadSiteImage, updateSiteStyle } from './actions'
import { FONT_PAIRS, BACKGROUNDS, ACCENTS, GLOWS, HOVERS, type SiteStyle } from '@/lib/site-style'

/** The customisation panel stakeholders asked for: fonts, colours, glow, motion. */
function StylePanel({ current }: { current: SiteStyle }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  async function set(key: string, value: string) {
    await updateSiteStyle({ [key]: value })
    router.refresh()
  }
  const Sel = ({ k, label, options }: { k: keyof SiteStyle; label: string; options: Record<string, { label: string } | string> }) => (
    <label className="block text-xs">
      <span className="eyebrow mb-1 block">{label}</span>
      <select defaultValue={(current[k] as string) ?? Object.keys(options)[0]}
        onChange={(e) => set(k, e.target.value)}
        className="w-full rounded-md border border-line bg-paper-2 px-2 py-1.5 text-xs text-ink outline-none focus:border-accent">
        {Object.entries(options).map(([v, o]) => (
          <option key={v} value={v}>{typeof o === 'string' ? o : o.label}</option>
        ))}
      </select>
    </label>
  )
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        title="Fonts, colours, glow and hover animation"
        className="rounded-pill border border-line bg-paper-2 px-3.5 py-2 text-sm text-ink hover:border-accent">
        ✨ Style
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 space-y-3 rounded-card border border-line bg-surface p-4 shadow-lift">
          <Sel k="fontPair" label="Fonts" options={FONT_PAIRS} />
          <Sel k="background" label="Background" options={BACKGROUNDS} />
          <Sel k="accent" label="Accent colour" options={ACCENTS} />
          <Sel k="glow" label="Card glow" options={GLOWS} />
          <Sel k="hover" label="Hover animation" options={HOVERS} />
          <p className="text-[10px] text-ink-3">Changes preview instantly. Publish to make them live.</p>
        </div>
      )}
    </div>
  )
}

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

const usePuckSel = createUsePuck()

/** Undo / redo, surfaced from Puck's built-in history (also on Ctrl+Z / Ctrl+Y). */
function HistoryButtons() {
  const history = usePuckSel((s) => s.history)
  const cls = 'rounded-pill border border-line bg-paper-2 px-3 py-1.5 text-sm text-ink hover:border-accent disabled:opacity-35 disabled:hover:border-line'
  return (
    <div className="mr-1 flex items-center gap-1.5">
      <button type="button" className={cls} title="Undo (Ctrl+Z)" aria-label="Undo"
        disabled={!history.hasPast} onClick={() => history.back()}>↺ Undo</button>
      <button type="button" className={cls} title="Redo (Ctrl+Y)" aria-label="Redo"
        disabled={!history.hasFuture} onClick={() => history.forward()}>↻ Redo</button>
    </div>
  )
}

// Stable identities (Puck re-mounts its UI if overrides change). The preview
// width is driven by a CSS variable set on the wrapper, so the device toggle
// never touches this object.
const puckOverrides: Partial<Overrides> = {
  headerActions: ({ children }) => (<><HistoryButtons />{children}</>),
  preview: ({ children }) => (
    <div className="editor-vp" style={{ maxWidth: 'var(--editor-vw, 100%)', margin: '0 auto' }}>
      {children}
    </div>
  ),
}

const DEVICES = [
  { key: 'desktop', label: '🖥 Desktop', width: '100%', help: 'Full width, as guests see it on a laptop' },
  { key: 'tablet', label: '⬛ Tablet', width: '768px', help: 'Preview how the page flows at tablet width' },
  { key: 'mobile', label: '📱 Phone', width: '390px', help: 'Preview how the page flows at phone width' },
] as const
type DeviceKey = (typeof DEVICES)[number]['key']

type Status = 'idle' | 'saving' | 'saved' | 'publishing' | 'published' | 'error' | 'locked'

export function WebsiteEditor({
  siteId, pageId, slug, data, events, published, templateName, styleProps, currentStyle,
}: {
  siteId: string; pageId: string; slug: string; data: SiteData; events: SiteEvent[]; published: boolean
  templateName: string
  styleProps: { style: React.CSSProperties; 'data-glow': string; 'data-hover': string }
  currentStyle: SiteStyle
}) {
  const [status, setStatus] = useState<Status>('idle')
  const [isPublished, setIsPublished] = useState(published)
  const [device, setDevice] = useState<DeviceKey>('desktop')
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
          <div className="flex items-center gap-1 rounded-pill border border-line bg-paper-2 p-1" role="group" aria-label="Preview width">
            {DEVICES.map((d) => (
              <button key={d.key} type="button" title={d.help} onClick={() => setDevice(d.key)}
                className={`rounded-pill px-2.5 py-1 text-xs transition-colors ${
                  device === d.key ? 'bg-accent-soft text-accent-ink' : 'text-ink-3 hover:text-ink'
                }`}>
                {d.label}
              </button>
            ))}
          </div>
          <StylePanel current={currentStyle} />
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
      {/* iframe disabled + style-engine vars on the wrapper = true WYSIWYG canvas */}
      <div className="min-h-0 flex-1" data-site-root data-device={device}
        {...styleProps}
        style={{ ...styleProps.style, '--editor-vw': DEVICES.find((d) => d.key === device)!.width } as React.CSSProperties}>
        <Puck
          config={siteConfig}
          data={data}
          metadata={{ events }}
          onChange={onChange}
          onPublish={publish}
          iframe={{ enabled: false }}
          overrides={puckOverrides}
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
