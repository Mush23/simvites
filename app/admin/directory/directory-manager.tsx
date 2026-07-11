'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminSaveDirectoryVendor, adminArchiveDirectoryVendor, type DirectoryVendorInput } from '../actions'
import { notify } from '@/components/ui/overlays'

export interface DirectoryRow extends Required<Omit<DirectoryVendorInput, 'featured'>> {
  featured: boolean
  archived_at: string | null
}

const CATEGORIES = ['catering', 'photography', 'decor', 'dj', 'coordinator', 'entertainment', 'florals', 'mehndi', 'transport', 'cake', 'venue', 'stationery']

const EMPTY: DirectoryVendorInput = { category: 'catering', name: '' }

export function DirectoryManager({ rows }: { rows: DirectoryRow[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<DirectoryVendorInput | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!editing || busy) return
    setBusy(true); setErr(null)
    const res = await adminSaveDirectoryVendor(editing)
    setBusy(false)
    if ('error' in res && res.error) { setErr(res.error); return }
    notify(editing.id ? 'Supplier updated' : 'Supplier added — live for every couple')
    setEditing(null)
    router.refresh()
  }

  const F = ({ k, label, placeholder }: { k: keyof DirectoryVendorInput; label: string; placeholder?: string }) => (
    <label className="block text-xs">
      <span className="microlabel mb-1 block">{label}</span>
      <input value={(editing?.[k] as string) ?? ''} placeholder={placeholder}
        onChange={(e) => setEditing((cur) => ({ ...(cur as DirectoryVendorInput), [k]: e.target.value }))}
        className="w-full rounded-md border border-line bg-paper-2 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent" />
    </label>
  )

  return (
    <div className="mt-6">
      {!editing && (
        <button type="button" onClick={() => setEditing({ ...EMPTY })}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white">
          ＋ Add supplier
        </button>
      )}

      {editing && (
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="mb-4 text-[14px] font-semibold text-ink">{editing.id ? 'Edit supplier' : 'New supplier'}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <F k="name" label="Name" placeholder="Saffron & Sage Catering" />
            <label className="block text-xs">
              <span className="microlabel mb-1 block">Category</span>
              <select value={editing.category}
                onChange={(e) => setEditing((c) => ({ ...(c as DirectoryVendorInput), category: e.target.value }))}
                className="w-full rounded-md border border-line bg-paper-2 px-2 py-1.5 text-[13px] text-ink outline-none focus:border-accent">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <F k="location" label="Location" placeholder="London & the South East" />
            <F k="tagline" label="Tagline" placeholder="Modern Indian feasting menus" />
            <F k="price_band" label="Price band" placeholder="££ – £££" />
            <F k="website" label="Website" placeholder="https://…" />
            <F k="instagram" label="Instagram" placeholder="@handle" />
            <F k="email" label="Email" />
            <F k="phone" label="Phone" />
            <F k="discount" label="Partner discount (shown to couples)" placeholder="10% off booking through Simvites" />
            <F k="promo_code" label="Promo code" placeholder="SIMVITES10" />
            <label className="flex items-end gap-2 pb-1 text-[13px] text-ink">
              <input type="checkbox" checked={editing.featured ?? false}
                onChange={(e) => setEditing((c) => ({ ...(c as DirectoryVendorInput), featured: e.target.checked }))} />
              Featured (pinned first)
            </label>
          </div>
          <label className="mt-3 block text-xs">
            <span className="microlabel mb-1 block">Blurb</span>
            <textarea value={editing.blurb ?? ''} rows={2}
              onChange={(e) => setEditing((c) => ({ ...(c as DirectoryVendorInput), blurb: e.target.value }))}
              className="w-full rounded-md border border-line bg-paper-2 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent" />
          </label>
          {err && <p className="mt-2 text-[12.5px] text-bad">{err}</p>}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={save} disabled={busy}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? 'Saving…' : 'Save supplier'}
            </button>
            <button type="button" onClick={() => setEditing(null)}
              className="rounded-md border border-line px-4 py-2 text-sm text-ink-2 hover:text-ink">Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-card border border-line bg-surface">
        {rows.map((r) => (
          <div key={r.id}
            className={`flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0 ${r.archived_at ? 'opacity-45' : ''}`}>
            <span className="microlabel w-24 shrink-0">{r.category}</span>
            <span className="min-w-[180px] text-[13.5px] font-medium text-ink">
              {r.name} {r.featured && <span title="Featured" className="text-accent-ink">★</span>}
            </span>
            <span className="flex-1 truncate text-[12px] text-ink-3">{r.tagline}</span>
            {r.discount && (
              <span className="rounded-full border border-accent-line bg-accent-soft px-2.5 py-0.5 text-[11px] font-medium text-accent-ink">
                {r.discount}{r.promo_code ? ` · ${r.promo_code}` : ''}
              </span>
            )}
            <button type="button" onClick={() => setEditing({ ...r })}
              className="rounded-md text-[12.5px] text-ink-3 underline-offset-2 hover:text-ink hover:underline">Edit</button>
            <button type="button"
              onClick={async () => { await adminArchiveDirectoryVendor(r.id, !r.archived_at); router.refresh() }}
              className="rounded-md text-[12.5px] text-ink-3 underline-offset-2 hover:text-ink hover:underline">
              {r.archived_at ? 'Restore' : 'Hide'}
            </button>
          </div>
        ))}
        {rows.length === 0 && <p className="px-4 py-6 text-sm text-ink-3">No suppliers yet — add your first partner above.</p>}
      </div>
    </div>
  )
}
