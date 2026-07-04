'use client'

import { useActionState, useState } from 'react'
import { createWorkspace, type OnboardingState } from './actions'
import { BASE_DOMAIN } from '@/lib/brand'

const initial: OnboardingState = {}

// Common celebrations across South Asian traditions — neutral-luxe stance:
// the host picks; nothing is assumed. All renamable later.
const STARTER_EVENTS = [
  'Mehndi', 'Haldi', 'Sangeet', 'Wedding Ceremony', 'Nikah',
  'Civil Ceremony', 'Reception', 'Walima', 'Next-day Brunch',
]
const PRESELECTED = new Set(['Wedding Ceremony', 'Reception'])

export function OnboardingForm() {
  const [state, action, pending] = useActionState(createWorkspace, initial)
  const [slug, setSlug] = useState('')

  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="eyebrow mb-1.5 block">Couple / site name</span>
        <input
          name="site_title" required placeholder="Aanya & Dev"
          className="w-full rounded-md border border-line bg-paper-2 px-3.5 py-3 text-ink outline-none focus:border-accent"
        />
      </label>

      <label className="block">
        <span className="eyebrow mb-1.5 block">Web address</span>
        <div className="flex items-baseline gap-1">
          <input
            name="slug" required value={slug} onChange={(e) => setSlug(e.target.value)}
            placeholder="aanya-and-dev"
            className="min-w-0 flex-1 rounded-md border border-line bg-paper-2 px-3.5 py-3 text-ink outline-none focus:border-accent"
          />
          <span className="shrink-0 text-sm text-ink-3">.{BASE_DOMAIN}</span>
        </div>
      </label>

      <fieldset>
        <legend className="eyebrow mb-2">Choose your look</legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {[
            { key: 'editorial-gold', name: 'Editorial Gold', desc: 'Cream, gold and deep red. Warm, ceremonial. The original.', swatches: ['#F5EFE3', '#C9A227', '#7A1F1F'], preview: '/s/aanya-and-dev' },
            { key: 'editorial-luxury', name: 'Editorial Luxury', desc: 'Ivory and ink with brass hairlines. Quiet, modern.', swatches: ['#F6F1E9', '#211D18', '#B08D57'], preview: '/s/riya-and-arjun' },
          ].map((t, i) => (
            <label key={t.key}
              className="flex cursor-pointer flex-col gap-2 rounded-md border border-line bg-paper-2 p-3.5 transition-colors has-checked:border-accent has-checked:bg-accent-soft">
              <span className="flex items-center gap-2">
                <input type="radio" name="template" value={t.key} defaultChecked={i === 0} className="accent-[var(--accent)]" />
                <span className="text-sm font-medium text-ink">{t.name}</span>
                <span className="ml-auto flex gap-1">
                  {t.swatches.map((c) => (
                    <span key={c} className="h-3.5 w-3.5 rounded-pill border border-line" style={{ background: c }} />
                  ))}
                </span>
              </span>
              <span className="text-xs text-ink-3">{t.desc}</span>
              <a href={t.preview} target="_blank" rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-accent-ink underline underline-offset-4">
                Preview this template ↗
              </a>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-2">Which celebrations? (pick any — rename later)</legend>
        <div className="flex flex-wrap gap-2">
          {STARTER_EVENTS.map((name) => (
            <label key={name}
              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-line bg-paper-2 px-3 text-sm text-ink transition-colors has-checked:border-accent has-checked:bg-accent-soft">
              <input type="checkbox" name="events" value={name} defaultChecked={PRESELECTED.has(name)}
                className="accent-[var(--accent)]" />
              {name}
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-bad">{state.error}</p>}

      <button
        type="submit" disabled={pending}
        className="w-full rounded-md bg-accent px-6 py-3 font-semibold text-white transition-transform hover:-translate-y-px disabled:opacity-50"
      >
        {pending ? 'Creating…' : 'Create site'}
      </button>
    </form>
  )
}
