'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Puck, createUsePuck, useGetPuck, type Overrides } from '@puckeditor/core'
import '@puckeditor/core/puck.css'
import { siteConfig, type SiteData } from '@/lib/puck/config'
import type { SiteEvent } from '@/components/site/blocks'
import { useRouter } from 'next/navigation'
import {
  savePageDraft, saveAndPublish, uploadSiteImage, updateSiteStyle,
  createPage, renamePage, setPageHidden, deletePage,
} from './actions'
import { SECTION_PRESETS } from '@/lib/puck/presets'
import { askConfirm, askPrompt, notify } from '@/components/ui/overlays'
import { Pencil, Trash2, Eye, EyeOff, FileText, ChevronDown, Palette, ExternalLink, Info, LayoutTemplate } from 'lucide-react'
import { FONT_PAIRS, BACKGROUNDS, ACCENTS, GLOWS, HOVERS, type SiteStyle } from '@/lib/site-style'

export interface EditorPage {
  id: string
  title: string
  slug: string
  is_home: boolean
  hidden: boolean
}

/** Multi-page management (Sprint D): switch, add, rename, hide, delete. */
function PagesMenu({ pages, currentId }: { pages: EditorPage[]; currentId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const current = pages.find((p) => p.id === currentId)

  async function add() {
    if (!newTitle.trim() || busy) return
    setBusy(true); setErr(null)
    const res = await createPage(newTitle)
    setBusy(false)
    if (res.error) setErr(res.error)
    else { setNewTitle(''); router.push(`/website?page=${res.id}`); router.refresh() }
  }

  return (
    <div className="relative">
      <button type="button" id="pages-menu" onClick={() => setOpen((o) => !o)}
        title="Add pages, rename them, or hide them from the menu"
        className="flex items-center gap-1.5 border border-line bg-paper-2 px-3 py-2 text-[13px] font-medium text-ink hover:border-line-2">
        <FileText size={14} strokeWidth={1.7} className="text-ink-3" /> {current?.title ?? 'Pages'} <ChevronDown size={12} strokeWidth={1.7} className="text-ink-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-50 w-72 space-y-1 rounded-card border border-line bg-surface p-3 shadow-lift">
          {pages.map((p) => (
            <div key={p.id} className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm ${
              p.id === currentId ? 'bg-accent-soft text-accent-ink' : 'text-ink hover:bg-paper-2'}`}>
              <button type="button" className="min-w-0 flex-1 truncate text-left"
                onClick={() => { setOpen(false); router.push(`/website?page=${p.id}`); router.refresh() }}>
                {p.title}{p.is_home && <span className="ml-1.5 font-mono text-[9px] uppercase tracking-wider text-ink-3">home</span>}
                {p.hidden && <span className="ml-1.5 font-mono text-[9px] uppercase tracking-wider text-warn">hidden</span>}
              </button>
              {!p.is_home && (
                <>
                  <button type="button" title="Rename this page" className="text-xs text-ink-3 hover:text-ink"
                    onClick={async () => {
                      const t = await askPrompt({ title: 'Rename page', placeholder: 'Page name', initial: p.title, confirmLabel: 'Rename' })
                      if (t) { await renamePage(p.id, t); router.refresh() }
                    }}><Pencil size={13} strokeWidth={1.7} /></button>
                  <button type="button" title={p.hidden ? 'Show in the site menu' : 'Hide from the site menu'}
                    className="text-xs text-ink-3 hover:text-ink"
                    onClick={async () => { await setPageHidden(p.id, !p.hidden); router.refresh() }}>
                    {p.hidden ? <EyeOff size={13} strokeWidth={1.7} /> : <Eye size={13} strokeWidth={1.7} />}
                  </button>
                  <button type="button" title="Delete this page" className="text-xs text-ink-3 hover:text-bad"
                    onClick={async () => {
                      if (!(await askConfirm({ title: `Delete "${p.title}"?`, body: 'The page and its sections are removed permanently.', confirmLabel: 'Delete page' }))) return
                      await deletePage(p.id)
                      notify('Page deleted')
                      if (p.id === currentId) router.push('/website')
                      router.refresh()
                    }}><Trash2 size={13} strokeWidth={1.7} /></button>
                </>
              )}
            </div>
          ))}
          <div className="flex gap-1.5 border-t border-line pt-2">
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
              placeholder="New page name, e.g. Travel"
              className="min-w-0 flex-1 rounded-md border border-line bg-paper-2 px-2 py-1.5 text-xs text-ink outline-none focus:border-accent" />
            <button type="button" onClick={add} disabled={busy}
              className="rounded-pill bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
              {busy ? '…' : 'Add'}
            </button>
          </div>
          {err && <p className="text-xs text-bad">{err}</p>}
          <p className="text-[10px] text-ink-3">Pages appear in your site menu. Publish to make changes live.</p>
        </div>
      )}
    </div>
  )
}

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
        className="flex items-center gap-1.5 border border-line bg-paper-2 px-3 py-2 text-[13px] font-medium text-ink hover:border-line-2">
        <Palette size={14} strokeWidth={1.7} className="text-ink-3" /> Style
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 space-y-3 rounded-card border border-line bg-surface p-4 shadow-lift">
          <Sel k="fontPair" label="Fonts" options={FONT_PAIRS} />
          <Sel k="background" label="Background" options={BACKGROUNDS} />
          <Sel k="accent" label="Accent colour" options={ACCENTS} />
          <Sel k="glow" label="Card glow" options={GLOWS} />
          <Sel k="hover" label="Hover animation" options={HOVERS} />

          {/* Brand kit (Sprint D): monogram + initials shown in the site menu */}
          <div className="border-t border-line pt-3">
            <span className="eyebrow mb-1.5 block">Brand kit — monogram</span>
            <div className="flex items-center gap-2">
              {current.monogram ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.monogram} alt="Monogram" className="h-10 w-10 rounded-full border border-line object-cover" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-line font-display text-sm text-accent-ink">
                  {current.initials || 'A·D'}
                </span>
              )}
              <label className="cursor-pointer rounded-pill border border-line bg-paper-2 px-3 py-1.5 text-xs text-ink hover:border-accent">
                {current.monogram ? 'Replace' : 'Upload'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    const fd = new FormData(); fd.set('file', f)
                    const res = await uploadSiteImage(fd)
                    if (res.url) await set('monogram', res.url)
                    e.target.value = ''
                  }} />
              </label>
              {current.monogram && (
                <button type="button" onClick={() => set('monogram', '')}
                  className="rounded-pill border border-line px-3 py-1.5 text-xs text-ink-3 hover:text-ink">
                  Remove
                </button>
              )}
            </div>
            <label className="mt-2 block text-xs">
              <span className="eyebrow mb-1 block">Initials (shown if no monogram)</span>
              <input defaultValue={current.initials ?? ''} placeholder="A & D" maxLength={12}
                onBlur={(e) => { if (e.target.value !== (current.initials ?? '')) set('initials', e.target.value) }}
                className="w-full rounded-md border border-line bg-paper-2 px-2 py-1.5 text-xs text-ink outline-none focus:border-accent" />
            </label>
            <p className="mt-1 text-[10px] text-ink-3">Shown at the top of your site and in the page menu guests see.</p>
          </div>

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

/** Section presets (Sprint D): one click inserts a pre-designed section. */
function PresetsMenu() {
  const getPuck = useGetPuck()
  const [open, setOpen] = useState(false)

  function insert(presetKey: string) {
    const preset = SECTION_PRESETS.find((p) => p.key === presetKey)
    if (!preset) return
    const { appState, dispatch } = getPuck()
    const content = [...appState.data.content]
    const item = {
      type: preset.type,
      props: { ...preset.props, id: `${preset.type}-${crypto.randomUUID()}` },
    } as (typeof content)[number]
    // Keep the footer last — new sections slot in just above it.
    const at = content.length > 0 && content[content.length - 1].type === 'SiteFooterBlock'
      ? content.length - 1 : content.length
    content.splice(at, 0, item)
    dispatch({ type: 'setData', data: { ...appState.data, content }, recordHistory: true })
    setOpen(false)
  }

  return (
    <div className="relative">
      <button type="button" id="presets-menu" onClick={() => setOpen((o) => !o)}
        title="Insert a beautifully pre-styled section"
        className="rounded-pill border border-line bg-paper-2 px-3 py-1.5 text-sm text-ink hover:border-accent">
        ✚ Add section
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 space-y-1 rounded-card border border-line bg-surface p-2 shadow-lift">
          {SECTION_PRESETS.map((p) => (
            <button key={p.key} type="button" onClick={() => insert(p.key)}
              className="block w-full rounded-md px-3 py-2 text-left hover:bg-paper-2">
              <span className="block text-sm text-ink">{p.name}</span>
              <span className="block text-[11px] text-ink-3">{p.desc}</span>
            </button>
          ))}
          <p className="px-3 pb-1 text-[10px] text-ink-3">Sections land above your footer, ready to edit.</p>
        </div>
      )}
    </div>
  )
}

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
/** Friendly empty-canvas state for brand-new pages (advanced-editor feel). */
function EmptyCanvasHint() {
  const count = usePuckSel((s) => s.appState.data.content.length)
  if (count > 0) return null
  return (
    <div className="pointer-events-none flex flex-col items-center gap-2 px-6 py-16 text-center">
      <LayoutTemplate size={22} strokeWidth={1.5} className="text-ink-3" />
      <p className="text-[13.5px] font-medium text-ink">This page is blank — let’s fix that.</p>
      <p className="max-w-[340px] text-[12.5px] text-ink-3">
        Drag a block in from the left panel, or use <span className="font-medium text-ink-2">✚ Add section</span> in
        the toolbar for a beautifully pre-styled start.
      </p>
    </div>
  )
}

const puckOverrides: Partial<Overrides> = {
  headerActions: ({ children }) => (<><PresetsMenu /><HistoryButtons />{children}</>),
  preview: ({ children }) => (
    <div className="editor-vp" style={{ maxWidth: 'var(--editor-vw, 100%)', margin: '0 auto' }}>
      <EmptyCanvasHint />
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
  siteId, pageId, pages, slug, data, events, published, templateName, styleProps, currentStyle,
}: {
  siteId: string; pageId: string; pages: EditorPage[]; slug: string; data: SiteData; events: SiteEvent[]; published: boolean
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

  // ⌘S / Ctrl+S — flush the autosave immediately (advanced-editor reflex).
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (timer.current) clearTimeout(timer.current)
        setStatus('saving')
        const res = await savePageDraft(pageId, latest.current)
        setStatus('error' in res && res.error ? 'error' : 'saved')
        notify('Draft saved')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pageId])

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col">
      {/* Toolbar — grouped clusters: context | canvas tools | ship */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-2">
        <span className="text-[14.5px] font-semibold tracking-tight text-ink">Website</span>
        <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
          {templateName}
        </span>
        <PagesMenu pages={pages} currentId={pageId} />

        <span aria-hidden className="hidden h-5 w-px bg-line md:block" />

        <div className="flex items-center gap-0.5 rounded-lg border border-line bg-paper-2 p-0.5" role="group" aria-label="Preview width">
          {DEVICES.map((d) => (
            <button key={d.key} type="button" title={d.help} onClick={() => setDevice(d.key)}
              className={`!rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                device === d.key ? 'bg-surface text-ink shadow-card' : 'text-ink-3 hover:text-ink'
              }`}>
              {d.label}
            </button>
          ))}
        </div>
        <StylePanel current={currentStyle} />
        <ImageUploader />

        <div className="ml-auto flex items-center gap-2.5">
          <StatusPill status={status} />
          {status === 'locked' && (
            <a href="/settings" id="unlock-cta"
              className="rounded-lg border border-accent-line bg-accent-soft px-3 py-1.5 text-[13px] font-medium text-accent-ink">
              Unlock to publish →
            </a>
          )}
          {isPublished && (
            <a href={`/s/${slug}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-ink hover:border-line-2">
              View live <ExternalLink size={12} strokeWidth={1.7} className="text-ink-3" />
            </a>
          )}
          <button id="publish-site" type="button" onClick={publish} disabled={status === 'publishing'}
            className="bg-accent px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50">
            {status === 'publishing' ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Gentle how-to strip — the zero-code promise, spelled out */}
      <div className="flex items-center gap-2 border-b border-line bg-paper-2 px-4 py-1.5 text-[11.5px] text-ink-3">
        <Info size={12} strokeWidth={1.7} className="shrink-0" />
        <span className="truncate">
          Click any text on the page and type · drag blocks in from the left · <span className="font-medium text-ink-2">✚ Add section</span> for
          ready-made looks · everything autosaves (<kbd className="rounded border border-line bg-surface px-1 font-mono text-[9.5px]">⌘S</kbd> to save now)
        </span>
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
