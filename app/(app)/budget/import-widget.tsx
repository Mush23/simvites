'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { importBudgetLines } from './actions'

export function BudgetImport() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  async function run() {
    const rows = text.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
      const [label = '', category = '', estimated = ''] = line.split(',').map((s) => s.trim())
      return { label, category, estimated }
    }).filter((r) => r.label)
    if (!rows.length) { setNote('Nothing to import.'); return }
    setBusy(true)
    const res = await importBudgetLines(rows)
    setBusy(false)
    setNote(res?.error ?? (res as { summary?: string }).summary ?? 'Done.')
    if (!res?.error) { setText(''); startTransition(() => router.refresh()) }
  }

  return (
    <div className="mt-4">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="rounded-md font-sans text-[11px] uppercase tracking-[0.16em] text-ink-3 hover:text-accent-ink">
        {open ? 'Close paste import' : 'Paste import'}
      </button>
      {open && (
        <div className="mt-3 rounded-card border border-accent-line bg-accent-soft/40 p-5">
          <p className="mb-2 text-sm text-ink-2">
            One line per row: <span className="font-mono text-xs">Label, Category, Estimated £</span>. Existing labels are skipped.
          </p>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5}
            placeholder={'Mandap & florals, Decor, 3500\nBridal outfit, Attire, 2200'}
            className="w-full rounded-md border border-line bg-surface px-3 py-2.5 font-mono text-xs text-ink outline-none focus:border-selected" />
          <div className="mt-3 flex items-center gap-3">
            <button type="button" onClick={run} disabled={busy}
              className="rounded-md border border-accent-line px-5 py-2 font-semibold text-accent-ink transition-colors hover:bg-accent-soft disabled:opacity-50">
              {busy ? 'Importing…' : 'Import'}
            </button>
            {note && <span className="text-sm text-ink-2">{note}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
