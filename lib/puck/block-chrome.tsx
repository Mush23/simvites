'use client'

// ═══════════════════════════════════════════════════════════════════════
// EditorBlockChrome — editor-only affordances around every canvas block:
// hover a block and you see its NAME (top-left chip) and an "＋ Add below"
// pill at its bottom edge, which opens a menu of pre-styled sections and
// blank blocks and splices the choice in right after this block. Rendered
// only when puck.isEditing — the public site never sees any of this.
// ═══════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { useGetPuck } from '@puckeditor/core'
import { Plus } from 'lucide-react'
import { SECTION_PRESETS } from './presets'
import { notify } from '@/components/ui/overlays'

interface MenuBlock { type: string; label: string; props: Record<string, unknown> }

export function EditorBlockChrome({ id, label, children }: {
  id: string
  label: string
  children: React.ReactNode
}) {
  const getPuck = useGetPuck()
  const [open, setOpen] = useState(false)
  const [blocks, setBlocks] = useState<MenuBlock[] | null>(null)

  async function openMenu() {
    if (!blocks) {
      // Lazy import avoids a static cycle (config → chrome → config).
      const { siteConfig } = await import('./config')
      setBlocks(Object.entries(siteConfig.components).map(([type, c]) => ({
        type,
        label: (c as { label?: string }).label ?? type,
        props: (c as { defaultProps?: Record<string, unknown> }).defaultProps ?? {},
      })))
    }
    setOpen((o) => !o)
  }

  function insertAfter(type: string, props: Record<string, unknown>, what: string) {
    const { appState, dispatch } = getPuck()
    const content = [...appState.data.content]
    const ix = content.findIndex((c) => (c.props as { id?: string } | undefined)?.id === id)
    const at = ix === -1 ? content.length : ix + 1
    const item = { type, props: { ...props, id: `${type}-${crypto.randomUUID()}` } } as (typeof content)[number]
    content.splice(at, 0, item)
    dispatch({ type: 'setData', data: { ...appState.data, content }, recordHistory: true })
    setOpen(false)
    notify(`${what} added below ${label}`)
  }

  return (
    <div className="ebc relative">
      {/* Block name — appears on hover, top-left */}
      <span className="ebc-chip">{label}</span>

      {/* Insert below — appears on hover at the bottom edge; pinned open
          while the menu is showing so it survives the mouse leaving. */}
      <div className="ebc-add" style={open ? { opacity: 1, pointerEvents: 'auto' } : undefined}>
        <button type="button" onClick={openMenu}
          className="flex items-center gap-1 !rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink shadow-card hover:border-accent">
          <Plus size={11} strokeWidth={2.2} /> Add below
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute left-1/2 top-8 z-50 max-h-[300px] w-64 -translate-x-1/2 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 text-left shadow-lift">
              <p className="microlabel px-2.5 pb-1 pt-1.5">Pre-styled sections</p>
              {SECTION_PRESETS.map((p) => (
                <button key={p.key} type="button"
                  onClick={() => insertAfter(p.type, p.props as unknown as Record<string, unknown>, p.name)}
                  className="block w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-surface-2">
                  <span className="block text-[12.5px] text-ink">{p.name}</span>
                  <span className="block text-[10.5px] text-ink-3">{p.desc}</span>
                </button>
              ))}
              <p className="microlabel border-t border-line px-2.5 pb-1 pt-2">Blank blocks</p>
              {(blocks ?? []).map((b) => (
                <button key={b.type} type="button"
                  onClick={() => insertAfter(b.type, b.props, b.label)}
                  className="block w-full rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-ink-2 hover:bg-surface-2 hover:text-ink">
                  {b.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {children}
    </div>
  )
}
