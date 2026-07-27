'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Download, MessageCircle, Mail, ExternalLink, Check } from 'lucide-react'
import { StdCard, STD_PALETTES, type StdData } from '@/components/save-the-date/std-card'
import { eventColor } from '@/lib/event-colors'
import { publicUrl } from '@/lib/tenant'
import { uploadSiteImage } from '@/app/(app)/website/actions'
import { saveStd, setStdPublished } from './actions'
import { notify } from '@/components/ui/overlays'

export interface StdEditorEvent { id: string; name: string; accent: string | null; dateText: string | null }
export interface StdRecord {
  shareToken: string; headline: string; names: string | null; message: string | null
  dateText: string | null; location: string | null; photoUrl: string | null
  palette: string; eventIds: string[]; published: boolean
}

const PALETTE_LABELS: Record<string, string> = {
  template: 'Site theme', gold: 'Gold', oxblood: 'Oxblood', sage: 'Sage', ink: 'Ink', midnight: 'Midnight',
}

export function StdEditor({ record, events, defaultNames }: {
  record: StdRecord | null; events: StdEditorEvent[]; defaultNames: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const refresh = () => startTransition(() => router.refresh())

  const [headline, setHeadline] = useState(record?.headline ?? 'Save the Date')
  const [names, setNames] = useState(record?.names ?? defaultNames)
  const [message, setMessage] = useState(record?.message ?? 'We can’t wait to celebrate with you. Formal invitations to follow.')
  const [dateText, setDateText] = useState(record?.dateText ?? '')
  const [location, setLocation] = useState(record?.location ?? '')
  const [photoUrl, setPhotoUrl] = useState(record?.photoUrl ?? '')
  const [palette, setPalette] = useState(record?.palette ?? 'template')
  const [eventIds, setEventIds] = useState<string[]>(record?.eventIds ?? [])
  const [published, setPublished] = useState(record?.published ?? false)
  const [token, setToken] = useState(record?.shareToken ?? '')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState<string | null>(null)

  // Derived from the configured root domain, not window.location.origin: this
  // is the link a couple copies and sends to guests, and it was reading
  // "localhost:3000/std/…" in development.
  const shareUrl = token ? publicUrl(`/std/${token}`) : ''

  const previewData: StdData = useMemo(() => ({
    headline, names: names || null, message: message || null, dateText: dateText || null,
    location: location || null, photoUrl: photoUrl || null, palette,
    events: eventIds.map((id) => events.find((e) => e.id === id)).filter(Boolean).map((e) => ({
      name: e!.name, accent: e!.accent, dateText: e!.dateText,
    })),
  }), [headline, names, message, dateText, location, photoUrl, palette, eventIds, events])

  function toggleEvent(id: string) {
    setEventIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
  }

  async function save() {
    setBusy(true)
    const fd = new FormData()
    fd.set('headline', headline); fd.set('names', names); fd.set('message', message)
    fd.set('date_text', dateText); fd.set('location', location); fd.set('photo_url', photoUrl); fd.set('palette', palette)
    eventIds.forEach((id) => fd.append('event_ids', id))
    const res = await saveStd(fd)
    setBusy(false)
    if (res.error) { notify(res.error, { tone: 'warn' }); return }
    if (res.token) setToken(res.token)
    notify('Save the Date saved')
    refresh()
  }

  async function togglePublish() {
    if (!token) { await save() }
    const next = !published
    const res = await setStdPublished(next)
    if (res.error) { notify(res.error, { tone: 'warn' }); return }
    setPublished(next)
    notify(next ? 'Published — your link is live' : 'Unpublished')
    refresh()
  }

  async function makeQr() {
    if (!shareUrl) return
    const QRCode = (await import('qrcode')).default
    setQr(await QRCode.toDataURL(shareUrl, { margin: 1, width: 512, color: { dark: '#211D18', light: '#FFFFFF' } }))
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const waText = encodeURIComponent(`${names || 'We'} — save our date! ${shareUrl}`)
  const mailBody = encodeURIComponent(`We're getting married and want you to save the date.\n\n${shareUrl}`)

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
      {/* Editor */}
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Headline" value={headline} onChange={setHeadline} />
          <Field label="Names" value={names} onChange={setNames} placeholder="Aanya & Dev" />
          <Field label="Date (your words)" value={dateText} onChange={setDateText} placeholder="September 2026" />
          <Field label="Location" value={location} onChange={setLocation} placeholder="Manchester, UK" />
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-ink-2">Message</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-selected" />
        </label>

        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-ink-2">Photo (optional)</span>
          <div className="flex items-center gap-2">
            {photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="h-11 w-11 rounded-md border border-line object-cover" />
            )}
            <label className="cursor-pointer rounded-lg border border-line bg-surface px-3 py-2 text-[13px] font-medium text-ink hover:border-line-2">
              {photoUrl ? 'Replace' : 'Upload photo'}
              <input type="file" accept="image/*" className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return
                  const fd = new FormData(); fd.set('file', f)
                  const res = await uploadSiteImage(fd)
                  if (res.url) setPhotoUrl(res.url); else notify(res.error ?? 'Upload failed', { tone: 'warn' })
                  e.target.value = ''
                }} />
            </label>
            {photoUrl && <button type="button" onClick={() => setPhotoUrl('')} className="rounded-md text-[12.5px] text-ink-3 hover:text-ink">Remove</button>}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-ink-2">Look</span>
          <div className="flex flex-wrap gap-2">
            {STD_PALETTES.map((p) => (
              <button key={p} type="button" onClick={() => setPalette(p)}
                className={`rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors ${
                  palette === p ? 'bg-ink text-paper' : 'border border-line text-ink-2 hover:border-line-2'}`}>
                {PALETTE_LABELS[p] ?? p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-ink-2">Which celebrations to tease? (combine any)</span>
          {events.length === 0 && <p className="text-[13px] text-ink-3">Add events first and they’ll appear here.</p>}
          <div className="flex flex-wrap gap-2">
            {events.map((e, i) => (
              <button key={e.id} type="button" onClick={() => toggleEvent(e.id)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                  eventIds.includes(e.id) ? 'border-selected-line bg-selected-soft text-ink' : 'border-line text-ink-2 hover:border-line-2'}`}>
                {/* Ramp fallback here only — the card itself is guest-layer and
                    keeps falling back to its own chosen palette accent. */}
                <span className="h-2 w-2 rounded-full" style={{ background: eventColor(e.accent, i) }} />
                {e.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <button type="button" onClick={save} disabled={busy}
            className="rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={togglePublish}
            className={`rounded-md px-4 py-2 text-[13px] font-semibold ${published ? 'border border-line text-ink' : 'bg-ink text-paper'}`}>
            {published ? 'Unpublish' : 'Publish & get link'}
          </button>
          {published && <span className="flex items-center gap-1.5 text-[12.5px] text-ok"><span className="h-1.5 w-1.5 rounded-full bg-ok" /> Live</span>}
        </div>

        {/* Share panel */}
        {token && published && (
          <div className="rounded-card border border-line bg-surface p-5 shadow-card">
            <p className="mb-3 text-[13px] font-semibold text-ink">Share it</p>
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ink-2">{shareUrl}</span>
              <button type="button" onClick={copyLink} className="rounded-md flex items-center gap-1 text-[12px] font-medium text-accent-ink">
                {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-ink hover:border-line-2">
                <MessageCircle size={14} className="text-ink-3" /> WhatsApp
              </a>
              <a href={`mailto:?subject=${encodeURIComponent('Save our date!')}&body=${mailBody}`}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-ink hover:border-line-2">
                <Mail size={14} className="text-ink-3" /> Email
              </a>
              <button type="button" onClick={makeQr}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-ink hover:border-line-2">
                <Download size={14} className="text-ink-3" /> QR code
              </button>
              <a href={shareUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-ink hover:border-line-2">
                <ExternalLink size={14} className="text-ink-3" /> Open card (print / save)
              </a>
            </div>
            {qr && (
              <div className="mt-4 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR code" className="h-28 w-28 rounded-lg border border-line" />
                <a href={qr} download="save-the-date-qr.png" className="text-[12.5px] font-medium text-accent-ink">Download PNG →</a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live preview */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <p className="mb-3 text-[12px] font-medium text-ink-3">Preview</p>
        <StdCard data={previewData} />
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-ink-2">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-selected" />
    </label>
  )
}
