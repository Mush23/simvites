'use client'

// ⌘K command palette (overhaul spec): 560px, 14vh from top, dark scrim +
// blur, 160ms pop-in. Searchable navigation + actions. Esc closes, ⌘K
// toggles, auto-focus. Small custom implementation — no cmdk dependency.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, MoonStar, ExternalLink } from 'lucide-react'
import { ALL_NAV_ITEMS } from './nav-model'
import { useTheme } from '@/components/theme/theme-provider'

export function CommandMenu({ siteSlug }: { siteSlug: string }) {
  const router = useRouter()
  const { resolved, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  interface Cmd { key: string; label: string; hint?: string; icon?: React.ReactNode; run: () => void }
  const commands = useMemo<Cmd[]>(() => [
    ...ALL_NAV_ITEMS.map((i) => ({
      key: i.href,
      label: `Go to ${i.label}`,
      icon: <i.icon size={15} strokeWidth={1.7} />,
      run: () => router.push(i.href),
    })),
    {
      key: 'preview', label: 'Preview your site', hint: 'opens a new tab',
      icon: <ExternalLink size={15} strokeWidth={1.7} />,
      run: () => window.open(`/s/${siteSlug}`, '_blank'),
    },
    {
      key: 'dark', label: resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
      icon: <MoonStar size={15} strokeWidth={1.7} />,
      run: toggle,
    },
  ], [router, siteSlug, resolved, toggle])

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return commands
    return commands.filter((c) => c.label.toLowerCase().includes(needle))
  }, [q, commands])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o); setQ(''); setSel(0)
      } else if (e.key === 'Escape') setOpen(false)
    }
    const onOpen = () => { setOpen(true); setQ(''); setSel(0) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('open-command-menu', onOpen)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('open-command-menu', onOpen) }
  }, [])

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30) }, [open])

  if (!open) return null

  function runSel(ix: number) {
    const cmd = results[ix]
    if (!cmd) return
    setOpen(false)
    cmd.run()
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/45 pt-[14vh] backdrop-blur-[3px]" onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()}
        className="mx-auto w-[560px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[14px] border border-line bg-surface shadow-lift"
        style={{ animation: 'dlg-in 160ms cubic-bezier(0.2, 0.9, 0.3, 1.1) both' }}>
        <input ref={inputRef} value={q}
          onChange={(e) => { setQ(e.target.value); setSel(0) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
            else if (e.key === 'Enter') runSel(sel)
          }}
          placeholder="Search modules and actions…"
          className="w-full border-b border-line bg-transparent px-4 py-3.5 text-sm text-ink outline-none placeholder:text-ink-3" />
        <div className="max-h-[320px] overflow-y-auto p-1.5">
          {results.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-ink-3">Nothing matches.</p>}
          {results.map((c, ix) => (
            <button key={c.key} type="button" onClick={() => runSel(ix)} onMouseEnter={() => setSel(ix)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13.5px] ${
                ix === sel ? 'bg-surface-2 text-ink' : 'text-ink-2'}`}>
              <span className="text-ink-3">{c.icon ?? <ArrowRight size={15} strokeWidth={1.7} />}</span>
              <span className="flex-1">{c.label}</span>
              {c.hint && <span className="font-mono text-[10px] text-ink-3">{c.hint}</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-line px-4 py-2 font-mono text-[9.5px] uppercase tracking-wider text-ink-3">
          <span>↑↓ navigate</span><span>↵ select</span><span>esc close</span>
        </div>
      </div>
    </div>
  )
}
