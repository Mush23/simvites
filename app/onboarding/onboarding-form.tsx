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
