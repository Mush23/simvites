'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Puck, createUsePuck, useGetPuck, type Overrides } from '@puckeditor/core'
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
import { Pencil, Trash2, Eye, EyeOff, FileText, ChevronDown, Palette, ExternalLink, Info, LayoutTemplate, Monitor, Tablet, Smartphone, Undo2, Redo2 } from 'lucide-react'
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
        className="rounded-md flex items-center gap-1.5 border border-line bg-paper-2 px-3 py-2 text-[13px] font-medium text-ink hover:border-line-2">
        <FileText size={14} strokeWidth={1.7} className="text-ink-3" /> {current?.title ?? 'Pages'} <ChevronDown size={12} strokeWidth={1.7} className="text-ink-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-50 w-72 space-y-1 rounded-card border border-line bg-surface p-3 shadow-lift">
          {pages.map((p) => (
            <div key={p.id} className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm ${
              p.id === currentId ? 'bg-accent-soft text-accent-ink' : 'text-ink hover:bg-paper-2'}`}>
              <button type="button" className="rounded-md min-w-0 flex-1 truncate text-left"
                onClick={() => { setOpen(false); router.push(`/website?page=${p.id}`); router.refresh() }}>
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
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
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
/** E2: Design menu — every template as a swatch card, switch in one click,
 * with live preview links. Answers "how do I even see the other designs?". */
function DesignMenu({ current, templateName, slug }: { current: SiteStyle; templateName: string; slug: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
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
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        title="Switch templates — your content stays, the whole look changes"
        className="rounded-md flex items-center gap-1.5 border border-line bg-paper-2 px-3 py-2 text-[13px] font-medium text-ink hover:border-line-2">
        <LayoutTemplate size={14} strokeWidth={1.7} className="text-ink-3" />
        {templateName} <ChevronDown size={12} strokeWidth={1.7} className="text-ink-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-50 max-h-[70vh] w-[340px] overflow-y-auto rounded-card border border-line bg-surface p-3 shadow-lift">
          <p className="mb-2 px-1 text-[11px] text-ink-3">
            One click restyles everything — colours, fonts, buttons. Your text and photos never move.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {listTemplates().map((t) => (
              <div key={t.key}
                className={`rounded-[10px] border p-2 text-left transition-colors ${
                  t.key === activeKey ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-2'
                }`}>
                <button type="button" onClick={() => pick(t.key)} className="rounded-md block w-full text-left">
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
            className="mt-2 block px-1 text-[11px] text-ink-3 hover:text-ink">Your live site ↗</a>
        </div>
      )}
    </div>
  )
}

/** E2: first-visit coach strip — dismissable; the "?" sheet stays forever. */
function CoachStrip() {
  const [hidden, setHidden] = useState(true)
  useEffect(() => { setHidden(localStorage.getItem('editor-coach-dismissed') === '1') }, [])
  if (hidden) return null
  return (
    <div className="flex items-center gap-2 border-b border-line bg-paper-2 px-4 py-1.5 text-[11.5px] text-ink-3">
      <Info size={12} strokeWidth={1.7} className="shrink-0" />
      <span className="truncate">
        Click any text on the page and type · hover a section for its name + tools · drag blocks in from the left ·{' '}
        <span className="font-medium text-ink-2">✚ Add section</span> (top right of the page) for ready-made looks · everything autosaves
        (<kbd className="rounded border border-line bg-surface px-1 font-mono text-[9.5px]">⌘S</kbd> to save now) ·
        the <span className="font-medium text-ink-2">?</span> button remembers all of this for you
      </span>
      <button type="button" aria-label="Dismiss tips"
        onClick={() => { localStorage.setItem('editor-coach-dismissed', '1'); setHidden(true) }}
        className="ml-auto shrink-0 rounded px-1.5 text-ink-3 hover:text-ink">✕</button>
    </div>
  )
}

/** E2: the "?" help sheet — every editor move in one place, always reachable. */
function HelpMenu() {
  const [open, setOpen] = useState(false)
  const ROWS: [string, string][] = [
    ['Edit any text', 'Click it on the page and type. It saves by itself.'],
    ['Move a section', 'Drag it by its edge, or use the arrows in its toolbar.'],
    ['Add a section', 'Drag from the left panel, or ✚ Add section at the top right of the page for ready-made looks.'],
    ['Restyle one section', 'Click it, then open “Style — look, colour & motion” on the right: 10 looks, borrowed palettes, animations.'],
    ['Restyle everything', 'The Style button: fonts, your own colours, buttons, menus, backdrops.'],
    ['Change template', 'The template name in the toolbar — switch any time, content stays.'],
    ['Photos', 'Drop or upload a photo right inside any photo field — or search free photos there.'],
    ['Freeform canvas', 'A section where you drag words and photos anywhere — it keeps its exact shape on phones.'],
    ['Undo', '↺ at the top right of the page, or Ctrl+Z. Publish only goes live when you say so.'],
  ]
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Editor help"
        title="How everything works"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper-2 text-[12.5px] font-semibold text-ink-2 hover:border-accent hover:text-accent-ink">
        ?
      </button>
      {open && (
        <div className="absolute left-0 top-11 z-50 max-h-[70vh] w-[330px] overflow-y-auto rounded-card border border-line bg-surface p-4 shadow-lift">
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

/** D3: a labelled colour swatch — native picker, debounced (the picker fires
 * continuously while dragging), with a reset back to the template colour. */
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

function StylePanel({ current }: { current: SiteStyle }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
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
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        title="Fonts, colours, glow and hover animation"
        className="rounded-md flex items-center gap-1.5 border border-line bg-paper-2 px-3 py-2 text-[13px] font-medium text-ink hover:border-line-2">
        <Palette size={14} strokeWidth={1.7} className="text-ink-3" /> Style
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 max-h-[70vh] w-72 space-y-3 overflow-y-auto rounded-card border border-line bg-surface p-4 shadow-lift">
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
                  className="rounded-md border border-line px-3 py-1.5 text-xs text-ink-3 hover:text-ink">
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
        className="rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-ink hover:bg-paper-2">
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

/** AI section composer — describe a section, get it written and inserted. */
function AiSectionMenu() {
  const getPuck = useGetPuck()
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  async function compose() {
    if (!prompt.trim() || busy) return
    setBusy(true); setNote(null)
    const res = await aiComposeSection(prompt)
    setBusy(false)
    if (res.notConfigured) { setNote('AI is not connected yet. Add an ANTHROPIC_API_KEY to switch this on.'); return }
    if (res.error || !res.type) { setNote(res.error ?? 'Something went wrong.'); return }

    // Merge onto the block's defaults (styleOpts etc.), insert above the footer.
    const { siteConfig: cfg } = await import('@/lib/puck/config')
    const defaults = (cfg.components[res.type as keyof typeof cfg.components] as { defaultProps?: Record<string, unknown> })?.defaultProps ?? {}
    const { appState, dispatch } = getPuck()
    const content = [...appState.data.content]
    const item = {
      type: res.type,
      props: { ...defaults, ...res.props, id: `${res.type}-${crypto.randomUUID()}` },
    } as (typeof content)[number]
    const at = content.length > 0 && content[content.length - 1].type === 'SiteFooterBlock'
      ? content.length - 1 : content.length
    content.splice(at, 0, item)
    dispatch({ type: 'setData', data: { ...appState.data, content }, recordHistory: true })
    setOpen(false); setPrompt('')
    notify('Section written and added — read it over and tweak anything')
  }

  return (
    <div className="relative">
      <button type="button" id="ai-section" onClick={() => setOpen((o) => !o)}
        title="Describe a section and AI writes it for you"
        className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-ink hover:bg-paper-2">
        ✦ AI
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-card border border-line bg-surface p-3 shadow-lift">
          <p className="mb-2 text-[12px] font-medium text-ink-2">What should this section say?</p>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
            placeholder={'e.g. "Our story — we met at university in London, bonded over bad coffee, got engaged in Santorini last summer"'}
            className="w-full rounded-lg border border-line bg-paper px-2.5 py-2 text-[12.5px] text-ink outline-none focus:border-accent" />
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={compose} disabled={busy || !prompt.trim()}
              className="rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50">
              {busy ? 'Writing…' : 'Write it'}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="rounded-md border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink">Cancel</button>
          </div>
          {note && <p className="mt-2 text-[11.5px] text-ink-3">{note}</p>}
        </div>
      )}
    </div>
  )
}

/** Undo / redo, surfaced from Puck's built-in history (also on Ctrl+Z / Ctrl+Y). */
function HistoryButtons() {
  const history = usePuckSel((s) => s.history)
  const cls = 'flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-paper-2 hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent'
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" className={cls} title="Undo (Ctrl+Z)" aria-label="Undo"
        disabled={!history.hasPast} onClick={() => history.back()}><Undo2 size={14} strokeWidth={1.7} /></button>
      <button type="button" className={cls} title="Redo (Ctrl+Y)" aria-label="Redo"
        disabled={!history.hasFuture} onClick={() => history.forward()}><Redo2 size={14} strokeWidth={1.7} /></button>
    </div>
  )
}

/** 1a: one floating action group, top right of the canvas — insertion and
 * history live where sections appear, not in chrome. Sticky inside the
 * canvas scroll, zero-height so it overlays the page. */
function CanvasActions() {
  return (
    <div className="pointer-events-none sticky top-2.5 z-40 flex h-0 justify-end pr-3">
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-line bg-surface p-1 shadow-card">
        <PresetsMenu />
        <AiSectionMenu />
        <span aria-hidden className="mx-0.5 h-5 w-px bg-line" />
        <HistoryButtons />
      </div>
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
  // Note: Puck's own header (its Publish + mini undo icons) is dropped
  // entirely — three Publish buttons on one screen confused everyone. Ours
  // in the toolbar carries the status/lock states and is the single source.
  // Section insertion + history float over the canvas (CanvasActions).
  header: () => <></>,
  preview: ({ children }) => (
    <div className="editor-vp" style={{ maxWidth: 'var(--editor-vw, 100%)', margin: '0 auto' }}>
      <CanvasActions />
      <EmptyCanvasHint />
      {children}
    </div>
  ),
}

const DEVICES = [
  { key: 'desktop', label: 'Desktop', icon: Monitor, width: '100%', help: 'Full width, as guests see it on a laptop' },
  { key: 'tablet', label: 'Tablet', icon: Tablet, width: '768px', help: 'Preview how the page flows at tablet width' },
  { key: 'mobile', label: 'Phone', icon: Smartphone, width: '390px', help: 'Preview how the page flows at phone width' },
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
    <div className="puck-shell flex h-[calc(100vh-57px)] flex-col">
      {/* Toolbar — ONE row, three named zones: Site / View / Ship (1a) */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-line bg-surface px-4 py-2">
        <span className="microlabel" aria-hidden>Site</span>
        <DesignMenu current={currentStyle} templateName={templateName} slug={slug} />
        <PagesMenu pages={pages} currentId={pageId} />
        <StylePanel current={currentStyle} />

        <span aria-hidden className="mx-1 hidden h-5 w-px bg-line md:block" />

        <span className="microlabel" aria-hidden>View</span>
        <div className="flex items-center gap-0.5 rounded-pill border border-line bg-paper-2 p-0.5" role="group" aria-label="Preview width">
          {DEVICES.map((d) => (
            <button key={d.key} type="button" title={d.help} aria-label={d.label}
              aria-pressed={device === d.key} onClick={() => setDevice(d.key)}
              className={`flex h-[26px] w-[30px] items-center justify-center rounded-pill transition-colors ${
                device === d.key ? 'bg-surface text-ink shadow-card' : 'text-ink-3 hover:text-ink'
              }`}>
              <d.icon size={13} strokeWidth={1.7} />
            </button>
          ))}
        </div>
        <HelpMenu />

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
            className="rounded-md bg-accent px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50">
            {status === 'publishing' ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>

      <CoachStrip />
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
