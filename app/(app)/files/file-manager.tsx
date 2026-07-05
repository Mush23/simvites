'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { uploadFile, deleteFile } from './actions'
import { askConfirm, notify } from '@/components/ui/overlays'
import { X } from 'lucide-react'

export interface Option { id: string; name: string }
export interface FileRow {
  id: string
  name: string
  kind: string | null
  event_id: string | null
  vendor_id: string | null
  created_at: string
}

const KINDS = ['contract', 'quote', 'invoice', 'menu', 'floorplan', 'image', 'other']

export function FileManager({ files, events, vendors }: {
  files: FileRow[]; events: Option[]; vendors: Option[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const refresh = () => startTransition(() => router.refresh())
  const formRef = useRef<HTMLFormElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onUpload(fd: FormData) {
    setBusy(true); setError(null)
    const res = await uploadFile(fd)
    setBusy(false)
    if (res?.error) setError(res.error)
    else { formRef.current?.reset(); refresh() }
  }

  return (
    <div className="space-y-8">
      <form ref={formRef} action={onUpload}
        className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
        <label className="block">
          <span className="eyebrow mb-1.5 block">File (max 20 MB)</span>
          <input name="file" type="file" required
            className="block w-64 text-sm text-ink-2 file:mr-3 file:rounded-md file:border file:border-line file:bg-paper-2 file:px-3 file:py-2 file:text-sm file:text-ink" />
        </label>
        <label className="block">
          <span className="eyebrow mb-1.5 block">Kind</span>
          <select name="kind" defaultValue="contract"
            className="rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent">
            {KINDS.map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
        <Select name="event_id" label="Event" options={events} />
        <Select name="vendor_id" label="Vendor" options={vendors} />
        <button type="submit" disabled={busy}
          className="rounded-md bg-accent px-5 py-2.5 font-semibold text-white disabled:opacity-50">
          {busy ? 'Uploading…' : 'Upload'}
        </button>
        {error && <p className="w-full text-sm text-bad">{error}</p>}
      </form>

      {files.length === 0 && (
        <div className="rounded-card border border-dashed border-line bg-paper-2 p-10 text-center text-ink-2">
          No files yet — contracts and quotes live here, linked to the right vendor and event.
        </div>
      )}

      <div className="space-y-2">
        {files.map((f) => {
          const linked = [
            events.find((e) => e.id === f.event_id)?.name,
            vendors.find((v) => v.id === f.vendor_id)?.name,
          ].filter(Boolean).join(' · ')
          return (
            <div key={f.id} className="flex items-center gap-3 rounded-card border border-line bg-surface p-3.5 shadow-card">
              <span className="rounded-pill bg-paper-2 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
                {f.kind ?? 'file'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{f.name}</p>
                {linked && <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">{linked}</p>}
              </div>
              <a href={`/files/${f.id}/download`}
                className="rounded-md border border-line bg-paper-2 px-3 py-1.5 text-sm hover:border-accent">
                Download
              </a>
              <button type="button"
                onClick={async () => {
                  if (!(await askConfirm({ title: `Delete ${f.name}?`, body: 'This file is removed permanently.', confirmLabel: 'Delete' }))) return
                  await deleteFile(f.id); notify('File deleted'); refresh()
                }}
                aria-label={`Delete ${f.name}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-bad-soft hover:text-bad"><X size={14} strokeWidth={1.7} /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Select({ name, label, options }: { name: string; label: string; options: Option[] }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      <select name={name} defaultValue=""
        className="max-w-40 rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent">
        <option value="">—</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  )
}
