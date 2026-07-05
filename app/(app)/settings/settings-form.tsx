'use client'

import { useState } from 'react'
import { updateSiteSettings } from './actions'
import type { TemplateListing } from '@/lib/templates/registry'

function toLocal(v: string | null) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function SiteSettingsForm({ title, deadlineDefault, templateKey, templates }: {
  title: string
  deadlineDefault: string | null
  templateKey: string
  templates: TemplateListing[]
}) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function action(fd: FormData) {
    setStatus('saving'); setError(null)
    const res = await updateSiteSettings(fd)
    if (res?.error) { setError(res.error); setStatus('error') } else setStatus('saved')
  }

  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="eyebrow mb-1.5 block">Site name</span>
        <input name="title" defaultValue={title} required
          className="w-full rounded-md border border-line bg-paper-2 px-3.5 py-3 text-ink outline-none focus:border-accent" />
      </label>
      <fieldset>
        <legend className="eyebrow mb-2">Template</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {templates.map((t) => (
            <label key={t.key}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-surface p-3 transition-colors has-checked:border-accent has-checked:shadow-[0_0_0_1px_var(--accent)]">
              <input type="radio" name="template" value={t.key} defaultChecked={t.key === templateKey}
                className="accent-[var(--accent)]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[14.5px] text-ink">{t.name}</span>
                {t.mood && <span className="block text-[11px] text-ink-3">{t.mood}</span>}
                <a href={`/preview/${t.key}`} target="_blank" rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] font-medium text-accent-ink underline underline-offset-2">Preview ↗</a>
              </span>
              <span className="flex shrink-0 gap-1">
                {t.swatches.map((c) => (
                  <span key={c} className="h-3 w-3 rounded-full border border-line" style={{ background: c }} />
                ))}
              </span>
            </label>
          ))}
        </div>
        <span className="mt-1.5 block text-xs text-ink-3">
          Changes apply to the live site on your next publish.
        </span>
      </fieldset>
      <label className="block">
        <span className="eyebrow mb-1.5 block">RSVP deadline (site-wide default)</span>
        <input name="rsvp_deadline_default" type="datetime-local" defaultValue={toLocal(deadlineDefault)}
          className="w-full rounded-md border border-line bg-paper-2 px-3.5 py-3 text-ink outline-none focus:border-accent" />
        <span className="mt-1.5 block text-xs text-ink-3">
          Individual events can override this on their own page.
        </span>
      </label>
      <div className="flex items-center gap-4">
        <button type="submit"
          className="rounded-md bg-accent px-6 py-3 font-semibold text-white">
          Save
        </button>
        {status === 'saved' && <span className="eyebrow text-accent-ink">Saved</span>}
        {status === 'saving' && <span className="eyebrow">Saving…</span>}
        {error && <span className="text-sm text-bad">{error}</span>}
      </div>
    </form>
  )
}
