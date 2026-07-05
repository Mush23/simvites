'use client'

// ═══════════════════════════════════════════════════════════════════════
// Overlay primitives (design overhaul): toast queue + confirm/prompt
// dialogs. Replaces every window.confirm()/window.prompt() in the tool.
// Dialogs: 420px card, pop-in 160ms. Toasts: dark, bottom-right, 4.2s,
// optional Undo action.
// ═══════════════════════════════════════════════════════════════════════

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Info, TriangleAlert } from 'lucide-react'

interface Toast {
  id: number
  text: string
  tone?: 'ok' | 'info' | 'warn'
  actionLabel?: string
  onAction?: () => void
}

interface ConfirmOpts {
  title: string
  body?: string
  confirmLabel?: string
  /** true = red destructive confirm (default); false = coral primary. */
  destructive?: boolean
}
interface PromptOpts {
  title: string
  body?: string
  placeholder?: string
  initial?: string
  confirmLabel?: string
}

interface OverlayApi {
  toast: (text: string, opts?: Omit<Toast, 'id' | 'text'>) => void
  confirm: (opts: ConfirmOpts) => Promise<boolean>
  prompt: (opts: PromptOpts) => Promise<string | null>
}

const OverlayCtx = createContext<OverlayApi | null>(null)

export function useOverlays(): OverlayApi {
  const ctx = useContext(OverlayCtx)
  if (!ctx) throw new Error('useOverlays must be used inside <OverlayProvider>')
  return ctx
}

// Imperative escape hatch: call from any client code without wiring the hook
// through component trees. The provider listens for these events.
export function askConfirm(opts: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('overlay-confirm', { detail: { opts, resolve } }))
  })
}
export function askPrompt(opts: PromptOpts): Promise<string | null> {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('overlay-prompt', { detail: { opts, resolve } }))
  })
}
export function notify(text: string, opts?: Omit<Toast, 'id' | 'text'>) {
  window.dispatchEvent(new CustomEvent('overlay-toast', { detail: { text, opts } }))
}

type DialogState =
  | { kind: 'confirm'; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: 'prompt'; opts: PromptOpts; resolve: (v: string | null) => void }
  | null

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [dialog, setDialog] = useState<DialogState>(null)
  const idRef = useRef(1)
  const promptRef = useRef<HTMLInputElement>(null)

  const toast = useCallback((text: string, opts?: Omit<Toast, 'id' | 'text'>) => {
    const id = idRef.current++
    setToasts((t) => [...t, { id, text, ...opts }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  const confirm = useCallback((opts: ConfirmOpts) =>
    new Promise<boolean>((resolve) => setDialog({ kind: 'confirm', opts, resolve })), [])
  const prompt = useCallback((opts: PromptOpts) =>
    new Promise<string | null>((resolve) => setDialog({ kind: 'prompt', opts, resolve })), [])

  function close(result: boolean | string | null) {
    if (!dialog) return
    if (dialog.kind === 'confirm') dialog.resolve(Boolean(result))
    else dialog.resolve(typeof result === 'string' ? result : null)
    setDialog(null)
  }

  useEffect(() => {
    if (dialog?.kind === 'prompt') setTimeout(() => promptRef.current?.focus(), 30)
    if (!dialog) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog])

  useEffect(() => {
    const onConfirm = (e: Event) => {
      const { opts, resolve } = (e as CustomEvent).detail
      setDialog({ kind: 'confirm', opts, resolve })
    }
    const onPrompt = (e: Event) => {
      const { opts, resolve } = (e as CustomEvent).detail
      setDialog({ kind: 'prompt', opts, resolve })
    }
    const onToast = (e: Event) => {
      const { text, opts } = (e as CustomEvent).detail
      toast(text, opts)
    }
    window.addEventListener('overlay-confirm', onConfirm)
    window.addEventListener('overlay-prompt', onPrompt)
    window.addEventListener('overlay-toast', onToast)
    return () => {
      window.removeEventListener('overlay-confirm', onConfirm)
      window.removeEventListener('overlay-prompt', onPrompt)
      window.removeEventListener('overlay-toast', onToast)
    }
  }, [toast])

  return (
    <OverlayCtx.Provider value={{ toast, confirm, prompt }}>
      {children}

      {dialog && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/45 pt-[18vh] backdrop-blur-[3px]"
          onClick={() => close(null)}>
          <div onClick={(e) => e.stopPropagation()}
            className="w-[420px] max-w-[calc(100vw-32px)] rounded-[14px] border border-line bg-surface p-5 shadow-lift"
            style={{ animation: 'dlg-in 160ms cubic-bezier(0.2, 0.9, 0.3, 1.1) both' }}>
            <h2 className="text-base font-semibold tracking-tight text-ink">{dialog.opts.title}</h2>
            {dialog.opts.body && <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{dialog.opts.body}</p>}
            {dialog.kind === 'prompt' && (
              <input ref={promptRef} defaultValue={dialog.opts.initial ?? ''} placeholder={dialog.opts.placeholder}
                onKeyDown={(e) => { if (e.key === 'Enter') close((e.target as HTMLInputElement).value) }}
                className="mt-3 w-full rounded-lg border border-line bg-paper-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent" />
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => close(null)}
                className="border border-line px-3.5 py-2 text-[13px] font-medium text-ink hover:border-line-2">
                Cancel
              </button>
              <button type="button"
                onClick={() => close(dialog.kind === 'prompt' ? (promptRef.current?.value ?? '') : true)}
                className={`px-3.5 py-2 text-[13px] font-semibold text-white ${
                  dialog.kind === 'confirm' && (dialog.opts.destructive ?? true) ? 'bg-bad' : 'bg-accent'}`}>
                {dialog.opts.confirmLabel ?? (dialog.kind === 'prompt' ? 'Save' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed bottom-4 right-4 z-[95] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id}
            className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#17171A] py-2.5 pl-3 pr-4 text-[13px] text-[#F2F2F0] shadow-lift"
            style={{ animation: 'toast-in 200ms cubic-bezier(0.2, 0.9, 0.3, 1.1) both' }}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-md ${
              t.tone === 'warn' ? 'bg-[rgba(240,178,90,0.18)] text-[#F0B25A]'
              : t.tone === 'info' ? 'bg-[rgba(126,151,232,0.18)] text-[#7E97E8]'
              : 'bg-[rgba(61,214,140,0.16)] text-[#3DD68C]'}`}>
              {t.tone === 'warn' ? <TriangleAlert size={13} /> : t.tone === 'info' ? <Info size={13} /> : <CheckCircle2 size={13} />}
            </span>
            {t.text}
            {t.actionLabel && (
              <button type="button"
                onClick={() => { t.onAction?.(); setToasts((x) => x.filter((y) => y.id !== t.id)) }}
                className="ml-1 font-semibold text-[oklch(0.72_0.18_30)] hover:underline">
                {t.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes dlg-in { from { opacity: 0; transform: translateY(8px) scale(0.97) } to { opacity: 1; transform: none } }
        @keyframes toast-in { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
      `}</style>
    </OverlayCtx.Provider>
  )
}
