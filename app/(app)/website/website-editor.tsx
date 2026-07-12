'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Puck, blocksPlugin, createUsePuck, useGetPuck, type Overrides } from '@puckeditor/core'
import '@puckeditor/core/puck.css'
import { siteConfig, type SiteData } from '@/lib/puck/config'
import type { SiteEvent } from '@/components/site/blocks'
import { useRouter } from 'next/navigation'
import {
  savePageDraft, saveAndPublish, uploadSiteImage, updateSiteStyle,
  createPage, renamePage, setPageHidden, deletePage, aiComposeSection,
} from './actions'
import { SECTION_PRESETS } from '@/lib/puck/presets'
import { askConfirm, askPrompt, notify } from '@/components/ui/overlays'
import { Pencil, Trash2, Eye, EyeOff, ExternalLink, LayoutTemplate, Monitor, Tablet, Smartphone, Undo2, Redo2 } from 'lucide-react'
import { BACKGROUNDS, ACCENTS, GLOWS, HOVERS, BACKDROPS, BUTTONS, NAVS, VIBES, type SiteStyle } from '@/lib/site-style'
import { DISPLAY_FACES, BODY_FACES } from '@/lib/template-fonts'
import { listTemplates } from '@/lib/templates/registry'

export interface EditorPage {
  id: string
  title: string
  slug: string
  is_home: boolean
  hidden: boolean
}

type DeviceKey = 'desktop' | 'tablet' | 'mobile'
type Status = 'idle' | 'saving' | 'saved' | 'publishing' | 'published' | 'error' | 'locked'

/** 1c: chrome recedes to one dock — the couple looks at their wedding, not
 * at panels. Dock + popovers read editor state through this context so the
 * Puck overrides keep stable identities. */
interface EditorMeta {
  pages: EditorPage[]
  pageId: string
  slug: string
  siteTitle: string
  templateName: string
  currentStyle: SiteStyle
  device: DeviceKey
  setDevice: (d: DeviceKey) => void
  status: Status
  isPublished: boolean
  publish: () => void
}
const EditorMetaCtx = createContext<EditorMeta | null>(null)
function useEditorMeta(): EditorMeta {
  const ctx = useContext(EditorMetaCtx)
  if (!ctx) throw new Error('EditorMetaCtx missing')
  return ctx
}

/** Pages: switch, add, rename, hide, delete (Sprint D, dock-homed). */
function PagesPanel() {
  const { pages, pageId } = useEditorMeta()
  const router = useRouter()
  const [newTitle, setNewTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function add() {
    if (!newTitle.trim() || busy) return
    setBusy(true); setErr(null)
    const res = await createPage(newTitle)
    setBusy(false)
    if (res.error) setErr(res.error)
    else { setNewTitle(''); router.push(`/website?page=${res.id}`); router.refresh() }
  }

  return (
    <div className="space-y-1 p-3">
      <p className="microlabel mb-2">Your pages</p>
      {pages.map((p) => (
        <div key={p.id} className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm ${
          p.id === pageId ? 'bg-accent-soft text-accent-ink' : 'text-ink hover:bg-paper-2'}`}>
          <button type="button" className="rounded-md min-w-0 flex-1 truncate text-left"
            onClick={() => { router.push(`/website?page=${p.id}`); router.refresh() }}>
            {p.title}{p.is_home && <span className="ml-1.5 font-mono text-[9px] uppercase tracking-wider text-ink-3">home</span>}
            {p.hidden && <span className="ml-1.5 font-mono text-[9px] uppercase tracking-wider text-warn">hidden</span>}
          </button>
          {!p.is_home && (
            <>
              <button type="button" title="Rename this page" className="rounded-md text-xs text-ink-3 hover:text-ink"
                onClick={async () => {
                  const t = await askPrompt({ title: 'Rename page', placeholder: 'Page name', initial: p.title, confirmLabel: 'Rename' })
                  if (t) { await renamePage(p.id, t); router.refresh() }
                }}><Pencil size={13} strokeWidth={1.7} /></button>
              <button type="button" title={p.hidden ? 'Show in the site menu' : 'Hide from the site menu'}
                className="rounded-md text-xs text-ink-3 hover:text-ink"
                onClick={async () => { await setPageHidden(p.id, !p.hidden); router.refresh() }}>
                {p.hidden ? <EyeOff size={13} strokeWidth={1.7} /> : <Eye size={13} strokeWidth={1.7} />}
              </button>
              <button type="button" title="Delete this page" className="rounded-md text-xs text-ink-3 hover:text-bad"
                onClick={async () => {
                  if (!(await askConfirm({ title: `Delete "${p.title}"?`, body: 'The page and its sections are removed permanently.', confirmLabel: 'Delete page' }))) return
                  await deletePage(p.id)
                  notify('Page deleted')
                  if (p.id === pageId) router.push('/website')
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
          className="!rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {busy ? '…' : 'Add'}
        </button>
      </div>
      {err && <p className="text-xs text-bad">{err}</p>}
      <p className="text-[10px] text-ink-3">Pages appear in your site menu. Publish to make changes live.</p>
    </div>
  )
}

/** E2: the "?" help sheet — every editor move in one place, always reachable. */
function HelpMenu() {
  const [open, setOpen] = useState(false)
  const ROWS: [string, string][] = [
    ['Edit any text', 'Click it on the page and type. It saves by itself.'],
    ['Move a section', 'Drag it by its edge, or use the arrows in its toolbar.'],
    ['Add a section', '＋ Add in the dock below — blocks, ready-made sections, or let ✦ AI draft one. Hovering a seam on the page offers ＋ Add below too.'],
    ['Edit a section', 'Click it — its settings appear in a panel beside the page.'],
    ['Restyle one section', 'Click it, then “Style — look, colour & motion” in its panel: 10 looks, borrowed palettes, animations.'],
    ['Restyle everything', 'Style in the dock: vibes, fonts, your own colours, buttons, menus, backdrops.'],
    ['Change template', 'The template name in the dock — switch any time, content stays.'],
    ['Pages', 'Pages in the dock: add, rename, hide from the menu, or delete.'],
    ['Photos', 'Drop or upload a photo right inside any photo field — or search free photos there.'],
    ['Undo', '↺ at the bottom left of the page, or Ctrl+Z. Publish only goes live when you say so.'],
  ]
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Editor help"
        title="How everything works"
        className="flex h-9 w-9 items-center justify-center !rounded-pill bg-ink/85 text-[13px] font-semibold text-paper shadow-lift backdrop-blur-md hover:bg-ink">
        ?
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 max-h-[70vh] w-[330px] overflow-y-auto rounded-card border border-line bg-surface p-4 shadow-lift">
          <p className="microlabel mb-2.5">How the editor works</p>
          {ROWS.map(([t, d]) => (
            <div key={t} className="border-b border-line py-2 last:border-0">
              <p className="text-[12.5px] font-semibold text-ink">{t}</p>
              <p className="text-[11.5px] leading-snug text-ink-3">{d}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** D3: a labelled colour swatch — native picker, debounced, with reset. */
function ColorPick({ k, label, value, onSet }: {
  k: keyof SiteStyle; label: string; value?: string
  onSet: (key: string, value: string) => Promise<void>
}) {
  const [local, setLocal] = useState(value || '#888888')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => { setLocal(value || '#888888') }, [value])
  const commitHex = (raw: string) => {
    const v = raw.startsWith('#') ? raw : `#${raw}`
    if (/^#[0-9a-fA-F]{6}$/.test(v)) { setLocal(v); onSet(k, v) }
  }
  return (
    <label className="block text-center text-xs">
      <span className="eyebrow mb-1 block text-[9px]">{label}</span>
      <input type="color" value={local}
        onChange={(e) => {
          const v = e.target.value
          setLocal(v)
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => onSet(k, v), 450)
        }}
        className="h-8 w-full cursor-pointer rounded-md border border-line bg-paper-2 p-0.5" />
      {/* E3: paste-a-hex path — brand codes come from Pinterest and stationers */}
      <input type="text" defaultValue={value ?? ''} placeholder="#hex" maxLength={7} spellCheck={false}
        key={value ?? 'unset'}
        onBlur={(e) => { if (e.target.value.trim()) commitHex(e.target.value.trim()) }}
        onKeyDown={(e) => { if (e.key === 'Enter') commitHex((e.target as HTMLInputElement).value.trim()) }}
        className="mt-1 w-full rounded border border-line bg-paper-2 px-1 py-0.5 text-center font-mono text-[9.5px] text-ink outline-none focus:border-accent" />
      {value ? (
        <button type="button" onClick={() => onSet(k, '')}
          className="rounded-md mt-0.5 text-[9px] text-ink-3 underline hover:text-ink">reset</button>
      ) : (
        <span className="mt-0.5 block text-[9px] text-ink-3">template</span>
      )}
    </label>
  )
}

/** Template: every look as a swatch card, switch in one click. */
function TemplateSwitcher() {
  const { currentStyle: current, slug } = useEditorMeta()
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const activeKey = current.template ?? 'editorial-gold'

  async function pick(key: string) {
    if (key === activeKey || busy) return
    setBusy(key)
    await updateSiteStyle({ template: key })
    setBusy(null)
    notify('Template switched — your words and photos stay put')
    router.refresh()
  }

  return (
    <div className="p-3">
      <p className="px-0.5 text-[11px] text-ink-3">
        One click restyles everything — colours, fonts, buttons. Your text and photos never move.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {listTemplates().map((t) => (
          <div key={t.key}
            className={`rounded-[10px] border p-2 text-left transition-colors ${
              t.key === activeKey ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-2'
            }`}>
            <button type="button" onClick={() => pick(t.key)} className="!rounded-md block w-full text-left">
              <span className="flex h-9 w-full overflow-hidden rounded-md border border-line">
                {t.swatches.map((c) => <span key={c} className="h-full flex-1" style={{ background: c }} />)}
              </span>
              <span className="mt-1.5 block text-[12px] font-medium leading-tight text-ink">
                {busy === t.key ? 'Switching…' : t.name}
              </span>
              <span className="block text-[10px] text-ink-3">{t.mood}</span>
            </button>
            <a href={`/preview/${t.key}`} target="_blank" rel="noreferrer"
              className="mt-1 inline-block text-[10px] text-accent-ink underline underline-offset-2">
              Full preview ↗
            </a>
          </div>
        ))}
      </div>
      <a href={`/s/${slug}`} target="_blank" rel="noreferrer"
        className="mt-2 block px-0.5 text-[11px] text-ink-3 hover:text-ink">Your live site ↗</a>
    </div>
  )
}

/** Style: vibes, fine-tune fold, brand kit — sitewide look in one panel. */
function StyleSections() {
  const { currentStyle: current } = useEditorMeta()
  const router = useRouter()
  const [vibing, setVibing] = useState<string | null>(null)

  async function set(key: string, value: string) {
    await updateSiteStyle({ [key]: value })
    router.refresh()
  }
  async function applyVibe(key: string) {
    const vibe = VIBES.find((v) => v.key === key)
    if (!vibe || vibing) return
    setVibing(key)
    await updateSiteStyle(vibe.patch as Record<string, string>)
    setVibing(null)
    notify(`${vibe.name} applied — fine-tune anything below`)
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
    <div className="space-y-4 p-3">
      {/* V1: vibes first — one tap sets the whole mood, no design degree needed */}
      <div>
        <span className="eyebrow mb-1.5 block">Pick a vibe — one tap styles everything</span>
        <div className="grid grid-cols-2 gap-2">
          {VIBES.map((v) => (
            <button key={v.key} type="button" onClick={() => applyVibe(v.key)} title={v.blurb}
              className="!rounded-[10px] border border-line p-2 text-left transition-colors hover:border-accent">
              <span className="flex h-5 w-full overflow-hidden rounded-md border border-line">
                {v.swatches.map((c) => <span key={c} className="h-full flex-1" style={{ background: c }} />)}
              </span>
              <span className="mt-1 block text-[11.5px] font-medium leading-tight text-ink">
                {vibing === v.key ? 'Applying…' : v.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Everything granular lives under the fold — power without overwhelm */}
      <details className="group border-t border-line pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[12.5px] font-medium text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
          Fine-tune — fonts, colours, buttons, motion
          <span className="text-ink-3 transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="mt-3 space-y-3">
          <Sel k="displayFont" label={`Heading font (${Object.keys(DISPLAY_FACES).length} faces)`} options={{ '': { label: 'Template default' }, ...DISPLAY_FACES }} />
          <Sel k="bodyFont" label={`Body font (${Object.keys(BODY_FACES).length} faces)`} options={{ '': { label: 'Template default' }, ...BODY_FACES }} />
          <Sel k="background" label="Background preset" options={BACKGROUNDS} />
          <Sel k="accent" label="Accent preset" options={ACCENTS} />

          {/* D3: colour pickers — any colour, fanned into the full token family */}
          <div className="grid grid-cols-3 gap-2 border-t border-line pt-3">
            <ColorPick k="customAccent" label="Accent" value={current.customAccent} onSet={set} />
            <ColorPick k="customPaper" label="Background" value={current.customPaper} onSet={set} />
            <ColorPick k="customInk" label="Text" value={current.customInk} onSet={set} />
          </div>

          <Sel k="buttonStyle" label="Button design" options={BUTTONS} />
          <Sel k="nav" label="Menu design" options={NAVS} />
          <Sel k="glow" label="Card glow" options={GLOWS} />
          <Sel k="hover" label="Hover animation" options={HOVERS} />
          <Sel k="backdrop" label="Backdrop effect (live site)" options={BACKDROPS} />
        </div>
      </details>

      {/* Brand kit (Sprint D): monogram + initials shown in the site menu */}
      <div className="border-t border-line pt-3">
        <span className="eyebrow mb-1.5 block">Brand kit — logo / monogram</span>
        <div className="flex items-center gap-2">
          {current.monogram ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.monogram} alt="Monogram" className="h-10 w-10 rounded-full border border-line object-cover" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-line font-display text-sm text-accent-ink">
              {current.initials || 'A·D'}
            </span>
          )}
          <label className="cursor-pointer rounded-md border border-line bg-paper-2 px-3 py-1.5 text-xs text-ink hover:border-accent">
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
              className="!rounded-md border border-line px-3 py-1.5 text-xs text-ink-3 hover:text-ink">
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
  )
}

const usePuckSel = createUsePuck()

/** Insert a piece of content just above the footer, with history. */
function useInsertSection() {
  const getPuck = useGetPuck()
  return (type: string, props: object) => {
    const { appState, dispatch } = getPuck()
    const content = [...appState.data.content]
    const item = { type, props: { ...props, id: `${type}-${crypto.randomUUID()}` } } as (typeof content)[number]
    const at = content.length > 0 && content[content.length - 1].type === 'SiteFooterBlock'
      ? content.length - 1 : content.length
    content.splice(at, 0, item)
    dispatch({ type: 'setData', data: { ...appState.data, content }, recordHistory: true })
  }
}

/** Ready-made sections (Sprint D) — part of the one insert surface. */
function PresetsList() {
  const insert = useInsertSection()
  return (
    <div className="flex flex-col gap-1.5">
      {SECTION_PRESETS.map((p) => (
        <button key={p.key} type="button"
          onClick={() => { insert(p.type, p.props); notify(`${p.name} added above your footer`) }}
          className="!rounded-md border border-line bg-paper px-2.5 py-2 text-left transition-colors hover:border-accent">
          <span className="block text-[12px] font-medium text-ink">{p.name}</span>
          <span className="block text-[10.5px] text-ink-3">{p.desc}</span>
        </button>
      ))}
    </div>
  )
}

/** AI section composer — describe a section, get it written and inserted. */
function AiDraft() {
  const insert = useInsertSection()
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  async function compose() {
    if (!prompt.trim() || busy) return
    setBusy(true); setNote(null)
    const res = await aiComposeSection(prompt)
    setBusy(false)
    if (res.notConfigured) { setNote('AI writing isn’t switched on yet — it’s coming with early access.'); return }
    if (res.error || !res.type) { setNote(res.error ?? 'Something went wrong.'); return }

    // Merge onto the block's defaults (styleOpts etc.), insert above the footer.
    const { siteConfig: cfg } = await import('@/lib/puck/config')
    const defaults = (cfg.components[res.type as keyof typeof cfg.components] as { defaultProps?: Record<string, unknown> })?.defaultProps ?? {}
    insert(res.type, { ...defaults, ...res.props })
    setOpen(false); setPrompt('')
    notify('Section written and added — read it over and tweak anything')
  }

  if (!open) {
    return (
      <button type="button" id="ai-section" onClick={() => setOpen(true)}
        title="Describe a section and AI writes it for you"
        className="mt-1.5 flex w-full items-center gap-1.5 !rounded-md border border-dashed border-line-2 px-2.5 py-2 text-left text-[12px] font-medium text-accent-ink transition-colors hover:border-accent">
        ✦ Describe a section — AI drafts it
      </button>
    )
  }
  return (
    <div className="mt-1.5 rounded-md border border-line bg-paper p-2.5">
      <p className="mb-1.5 text-[11.5px] font-medium text-ink-2">What should this section say?</p>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
        placeholder={'e.g. "Our story — we met at university in London, bonded over bad coffee, got engaged in Santorini last summer"'}
        className="w-full rounded-md border border-line bg-paper-2 px-2 py-1.5 text-[12px] text-ink outline-none focus:border-accent" />
      <div className="mt-1.5 flex items-center gap-1.5">
        <button type="button" onClick={compose} disabled={busy || !prompt.trim()}
          className="!rounded-md bg-accent px-2.5 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-50">
          {busy ? 'Writing…' : 'Write it'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="!rounded-md border border-line px-2.5 py-1.5 text-[11.5px] font-medium text-ink">Cancel</button>
      </div>
      {note && <p className="mt-1.5 text-[11px] text-ink-3">{note}</p>}
    </div>
  )
}

/** ＋ Add: stock draggable blocks + ready-made sections + the AI draft. */
const stockBlocks = blocksPlugin()
function AddPanel() {
  const Stock = stockBlocks.render
  return (
    <div>
      <div className="px-3 pt-3">
        <p className="microlabel">Drag onto the page</p>
      </div>
      {Stock && <Stock />}
      <div className="px-3 pb-4">
        <p className="microlabel mb-1.5">Ready-made sections</p>
        <PresetsList />
        <AiDraft />
        <p className="mt-2 text-[10px] text-ink-3">Sections land above your footer, ready to edit.</p>
      </div>
    </div>
  )
}

/** Undo / redo, surfaced from Puck's built-in history (also Ctrl+Z / Ctrl+Y). */
function HistoryButtons() {
  const history = usePuckSel((s) => s.history)
  const cls = 'flex h-7 w-7 items-center justify-center !rounded-md text-ink-3 hover:bg-paper-2 hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent'
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" className={cls} title="Undo (Ctrl+Z)" aria-label="Undo"
        disabled={!history.hasPast} onClick={() => history.back()}><Undo2 size={14} strokeWidth={1.7} /></button>
      <button type="button" className={cls} title="Redo (Ctrl+Y)" aria-label="Redo"
        disabled={!history.hasFuture} onClick={() => history.forward()}><Redo2 size={14} strokeWidth={1.7} /></button>
    </div>
  )
}

/** History docks bottom-left of the canvas — quiet, always in reach. */
function UndoDock() {
  return (
    <div className="pointer-events-none sticky bottom-3 z-40 flex h-0 justify-start pl-3">
      <div className="pointer-events-auto -translate-y-full rounded-lg border border-line bg-surface p-1 shadow-card">
        <HistoryButtons />
      </div>
    </div>
  )
}

const DEVICES = [
  { key: 'desktop', label: 'Desktop', icon: Monitor, width: '100%', help: 'Full width, as guests see it on a laptop' },
  { key: 'tablet', label: 'Tablet', icon: Tablet, width: '768px', help: 'Preview how the page flows at tablet width' },
  { key: 'mobile', label: 'Phone', icon: Smartphone, width: '390px', help: 'Preview how the page flows at phone width' },
] as const

/** 1c: THE dock — template · pages · add · style | width | status · publish.
 * One dark pill at the bottom; popovers open above it. */
function Dock() {
  const meta = useEditorMeta()
  const [open, setOpen] = useState<null | 'template' | 'pages' | 'add' | 'style'>(null)
  const template = listTemplates().find((t) => t.key === (meta.currentStyle.template ?? 'editorial-gold'))

  const tab = (key: NonNullable<typeof open>, label: React.ReactNode, title: string) => (
    <button type="button" title={title} aria-expanded={open === key}
      onClick={() => setOpen(open === key ? null : key)}
      className={`flex items-center gap-1.5 !rounded-pill px-3 py-1.5 text-[12px] font-medium text-paper transition-colors ${
        open === key ? 'bg-paper/20' : 'hover:bg-paper/10'}`}>
      {label}
    </button>
  )

  const statusMap: Record<Status, string> = {
    idle: '', saving: 'Saving…', saved: 'Saved', publishing: 'Publishing…',
    published: 'Published ✓', error: 'Save failed', locked: 'Locked',
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      {open && (
        <>
          <div className="fixed inset-0 z-[-1]" onClick={() => setOpen(null)} />
          <div className="absolute bottom-full left-1/2 mb-2.5 max-h-[62vh] w-[330px] max-w-[calc(100vw-20px)] -translate-x-1/2 overflow-y-auto rounded-card border border-line bg-surface shadow-lift">
            {open === 'template' && <TemplateSwitcher />}
            {open === 'pages' && <PagesPanel />}
            {open === 'add' && <AddPanel />}
            {open === 'style' && <StyleSections />}
          </div>
        </>
      )}
      <div className="flex max-w-[calc(100vw-16px)] items-center gap-0.5 overflow-x-auto !rounded-pill bg-ink/90 px-2 py-1.5 shadow-lift backdrop-blur-md">
        {tab('template', (
          <>
            <span className="flex gap-0.5">
              {(template?.swatches ?? []).slice(0, 3).map((c) => (
                <span key={c} className="h-2 w-2 rounded-[2px] border border-paper/20" style={{ background: c }} />
              ))}
            </span>
            <span className="hidden sm:inline">{template?.name ?? 'Template'}</span>
          </>
        ), 'Switch templates — your content stays')}
        {tab('pages', 'Pages', 'Add, rename or hide pages')}
        {tab('add', '＋ Add', 'Blocks, ready-made sections and AI drafts')}
        {tab('style', 'Style', 'Vibes, fonts, colours, buttons, motion')}

        <span aria-hidden className="mx-1 h-[18px] w-px shrink-0 bg-paper/20" />

        {DEVICES.map((d) => (
          <button key={d.key} type="button" title={d.help} aria-label={d.label}
            aria-pressed={meta.device === d.key} onClick={() => meta.setDevice(d.key)}
            className={`flex h-7 w-[30px] shrink-0 items-center justify-center !rounded-pill transition-colors ${
              meta.device === d.key ? 'bg-paper/20 text-paper' : 'text-paper/55 hover:text-paper'}`}>
            <d.icon size={13} strokeWidth={1.7} />
          </button>
        ))}

        <span aria-hidden className="mx-1 h-[18px] w-px shrink-0 bg-paper/20" />

        {statusMap[meta.status] && (
          <span className="shrink-0 px-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-paper/55">
            {statusMap[meta.status]}
          </span>
        )}
        {meta.status === 'locked' ? (
          <a href="/settings" id="unlock-cta"
            className="shrink-0 !rounded-pill border border-accent-line bg-accent-soft px-3.5 py-1.5 text-[12px] font-medium text-accent-ink">
            Unlock to publish →
          </a>
        ) : (
          <button id="publish-site" type="button" onClick={meta.publish} disabled={meta.status === 'publishing'}
            className="shrink-0 !rounded-pill bg-accent px-4 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50">
            {meta.status === 'publishing' ? 'Publishing…' : 'Publish'}
          </button>
        )}
      </div>
    </div>
  )
}

/** First-run spotlight on the dock — the coach strip's job, at the point
 * of need (1c risk note: discoverability of Pages/Style for first-timers). */
function DockSpotlight() {
  const [hidden, setHidden] = useState(true)
  useEffect(() => { setHidden(localStorage.getItem('editor-dock-spotlight') === '1') }, [])
  if (hidden) return null
  return (
    <div className="fixed bottom-[68px] left-1/2 z-50 w-[320px] max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-card border border-line bg-surface p-3.5 text-center shadow-lift">
      <p className="text-[12.5px] leading-relaxed text-ink-2">
        Click any text on the page and type — it saves by itself. Everything else lives in the dock
        below: <span className="font-medium text-ink">template · pages · ＋ Add · style</span>.
      </p>
      <button type="button"
        onClick={() => { localStorage.setItem('editor-dock-spotlight', '1'); setHidden(true) }}
        className="mt-2 !rounded-md border border-line px-3 py-1.5 text-[12px] font-medium text-ink hover:border-line-2">
        Got it
      </button>
    </div>
  )
}

/** Friendly empty-canvas state for brand-new pages. */
function EmptyCanvasHint() {
  const count = usePuckSel((s) => s.appState.data.content.length)
  if (count > 0) return null
  return (
    <div className="pointer-events-none flex flex-col items-center gap-2 px-6 py-16 text-center">
      <LayoutTemplate size={22} strokeWidth={1.5} className="text-ink-3" />
      <p className="text-[13.5px] font-medium text-ink">This page is blank — let’s fix that.</p>
      <p className="max-w-[340px] text-[12.5px] text-ink-3">
        Tap <span className="font-medium text-ink-2">＋ Add</span> in the dock below: drag a block in,
        or pick a ready-made section for a beautifully pre-styled start.
      </p>
    </div>
  )
}

// Stable identities (Puck re-mounts its UI if overrides change). The preview
// width is a CSS variable on the wrapper, so the device toggle never touches
// this object. Dock + spotlight render through the `puck` wrapper so their
// popovers keep Puck context (drag sources, history, dispatch).
const puckOverrides: Partial<Overrides> = {
  header: () => <></>,
  preview: ({ children }) => (
    <div className="editor-vp" style={{ maxWidth: 'var(--editor-vw, 100%)', margin: '0 auto' }}>
      <EmptyCanvasHint />
      {children}
      <UndoDock />
    </div>
  ),
  // 1c: the fields panel floats beside the artifact and only exists while a
  // block is selected — editing at the point of touch. The pf-* markers let
  // CSS collapse the whole floating card when nothing is selected.
  fields: ({ children, itemSelector }) => (
    <div className={itemSelector ? 'pf-open contents' : 'pf-closed hidden'}>{children}</div>
  ),
  puck: ({ children }) => (
    <>
      {children}
      <Dock />
      <DockSpotlight />
    </>
  ),
}

export function WebsiteEditor({
  siteId, siteTitle, pageId, pages, slug, data, events, published, templateName, styleProps, currentStyle,
}: {
  siteId: string; siteTitle: string; pageId: string; pages: EditorPage[]; slug: string
  data: SiteData; events: SiteEvent[]; published: boolean
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

  const meta = useMemo<EditorMeta>(
    () => ({ pages, pageId, slug, siteTitle, templateName, currentStyle, device, setDevice, status, isPublished, publish }),
    [pages, pageId, slug, siteTitle, templateName, currentStyle, device, status, isPublished, publish])

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
    <div className="puck-shell puck-dock relative h-screen">
      {/* Floating return — the tool quotes the artifact instead of framing it */}
      <Link href="/dashboard"
        className="fixed left-3 top-3 z-50 flex items-center gap-2 rounded-pill bg-ink/85 px-3.5 py-2 text-[12px] font-medium text-paper shadow-lift backdrop-blur-md hover:bg-ink">
        ← <span className="font-display text-[13px]">{siteTitle}</span> <span className="opacity-55">planning</span>
      </Link>
      <div className="fixed right-3 top-3 z-50 flex items-center gap-1.5">
        {isPublished && (
          <a href={`/s/${slug}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 rounded-pill bg-ink/85 px-3.5 py-2 text-[12px] font-medium text-paper shadow-lift backdrop-blur-md hover:bg-ink">
            View live <ExternalLink size={12} strokeWidth={1.7} className="opacity-70" />
          </a>
        )}
        <HelpMenu />
      </div>

      {/* iframe disabled + style-engine vars on the wrapper = true WYSIWYG canvas */}
      <div className="h-full" data-site-root data-device={device}
        {...styleProps}
        style={{ ...styleProps.style, '--editor-vw': DEVICES.find((d) => d.key === device)!.width } as React.CSSProperties}>
        <EditorMetaCtx.Provider value={meta}>
          <Puck
            config={siteConfig}
            data={data}
            metadata={{ events }}
            onChange={onChange}
            onPublish={publish}
            iframe={{ enabled: false }}
            overrides={puckOverrides}
          />
        </EditorMetaCtx.Provider>
      </div>
    </div>
  )
}
