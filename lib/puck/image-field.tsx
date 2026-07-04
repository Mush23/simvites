'use client'

import { useState } from 'react'

/**
 * Puck custom field: an image input with a real UPLOAD button (stakeholder
 * feedback: "we can't add photos"). Uploads to site-assets and writes the
 * URL straight into the field — no copy-pasting links.
 */
export function ImageFieldInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  return (
    <div>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="mb-2 h-20 w-full rounded-md border border-line object-cover" />
      )}
      <div className="flex gap-2">
        <label className={`cursor-pointer rounded-pill px-3 py-2 text-xs font-semibold text-white ${busy ? 'opacity-50' : ''}`}
          style={{ background: 'var(--accent, #B4552D)' }}>
          {busy ? 'Uploading…' : value ? 'Replace photo' : 'Upload photo'}
          <input type="file" accept="image/*" className="hidden" disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setBusy(true); setErr(null)
              const { uploadSiteImage } = await import('@/app/(app)/website/actions')
              const fd = new FormData(); fd.set('file', f)
              const res = await uploadSiteImage(fd)
              setBusy(false)
              if (res.url) onChange(res.url)
              else setErr(res.error ?? 'Upload failed')
              e.target.value = ''
            }} />
        </label>
        {value && (
          <button type="button" onClick={() => onChange('')}
            className="rounded-pill border px-3 py-2 text-xs" style={{ borderColor: 'var(--line, #ddd)' }}>
            Remove
          </button>
        )}
      </div>
      {err && <p className="mt-1 text-xs" style={{ color: '#7E3232' }}>{err}</p>}
    </div>
  )
}
