'use client'

// Onboarding (overhaul 3c): one page, three numbered moves. Same fields and
// server action as before; the template picker is registry-driven and lists
// every look on the platform.

import { useActionState, useState } from 'react'
import { createWorkspace, type OnboardingState } from './actions'
import { BASE_DOMAIN } from '@/lib/brand'
import type { TemplateListing } from '@/lib/templates/registry'

const initial: OnboardingState = {}

// Common celebrations across South Asian traditions — neutral-luxe stance:
// the host picks; nothing is assumed. All renamable later.
const STARTER_EVENTS = [
  'Mehndi', 'Haldi', 'Sangeet', 'Wedding Ceremony', 'Nikah',
  'Civil Ceremony', 'Reception', 'Walima', 'Next-day Brunch',
]
const PRESELECTED = new Set(['Wedding Ceremony', 'Reception'])

function MoveLabel({ n, title, hint }: { n: string; title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-2.5">
      <span className="font-mono text-[10px] font-semibold text-accent">{n}</span>
      <span className="text-[13.5px] font-semibold tracking-tight text-ink">{title}</span>
      {hint && <span className="text-[12px] text-ink-3">{hint}</span>}
    </div>
  )
}

export function OnboardingForm({ templates, preselect }: { templates: TemplateListing[]; preselect?: string }) {
  const [state, action, pending] = useActionState(createWorkspace, initial)
  const [slug, setSlug] = useState('')
  const preIx = preselect ? templates.findIndex((t) => t.key === preselect) : -1
  // If the chosen look sits past the fold, open the full grid so its radio renders.
  const [showAll, setShowAll] = useState(preIx >= 4)
  const shown = showAll ? templates : templates.slice(0, 4)
  const checkedIx = preIx >= 0 ? preIx : 0

  return (
    <form action={action} className="space-y-8">
      {/* 01 — names */}
      <section>
        <MoveLabel n="01" title="Who's getting married?" />
        <div className="space-y-3.5">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-ink-2">Couple / site name</span>
            <input
              name="site_title" required placeholder="Aanya & Dev"
              className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-selected"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-ink-2">Web address</span>
            <div className="flex items-center rounded-lg border border-line bg-surface focus-within:border-accent">
              <input
                name="slug" required value={slug} onChange={(e) => setSlug(e.target.value)}
                placeholder="aanya-and-dev"
                className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[14px] text-ink outline-none"
              />
              <span className="shrink-0 pr-3.5 font-mono text-[11px] text-ink-3">.{BASE_DOMAIN}</span>
            </div>
          </label>
        </div>
      </section>

      {/* 02 — look */}
      <section>
        <MoveLabel n="02" title="Choose your look" hint="change it any time" />
        <div className="grid gap-2.5 sm:grid-cols-2">
          {shown.map((t, i) => (
            <label key={t.key}
              className="group flex cursor-pointer flex-col gap-2 rounded-xl border border-line bg-surface p-3.5 transition-colors has-checked:border-selected-line has-checked:shadow-[0_0_0_1px_var(--selected-line)]">
              <span className="flex items-center gap-2">
                <input type="radio" name="template" value={t.key} defaultChecked={i === checkedIx} className="accent-[var(--selected)]" />
                <span className="font-display text-[15px] text-ink">{t.name}</span>
                <span className="ml-auto flex gap-1">
                  {t.swatches.map((c) => (
                    <span key={c} className="h-3.5 w-3.5 rounded-full border border-line" style={{ background: c }} />
                  ))}
                </span>
              </span>
              <span className="text-[11.5px] leading-relaxed text-ink-3">{t.description}</span>
              <a href={`/preview/${t.key}`} target="_blank" rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[11.5px] font-medium text-accent-ink underline underline-offset-2 hover:opacity-80">
                Preview this look ↗
              </a>
            </label>
          ))}
          {!showAll && templates.length > 4 && (
            <button type="button" onClick={() => setShowAll(true)}
              className="flex min-h-[74px] items-center justify-center rounded-xl border border-dashed border-line-2 text-[12.5px] font-medium text-ink-2 hover:border-accent hover:text-ink">
              +{templates.length - 4} more looks
            </button>
          )}
        </div>
      </section>

      {/* 03 — celebrations */}
      <section>
        <MoveLabel n="03" title="Which celebrations?" hint="pick any — rename later" />
        <div className="flex flex-wrap gap-2">
          {STARTER_EVENTS.map((name) => (
            <label key={name}
              className="flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[13px] text-ink transition-colors has-checked:border-selected-line has-checked:bg-selected-soft">
              <input type="checkbox" name="events" value={name} defaultChecked={PRESELECTED.has(name)}
                className="accent-[var(--accent)]" />
              {name}
            </label>
          ))}
        </div>
      </section>

      {state.error && <p className="text-[13px] text-bad">{state.error}</p>}

      <div>
        <button
          type="submit" disabled={pending}
          className="rounded-md w-full bg-accent px-6 py-3 text-[14px] font-semibold text-white disabled:opacity-50"
        >
          {pending ? 'Creating…' : 'Create my site'}
        </button>
        <p className="mt-2.5 text-center text-[12px] text-ink-3">Free while you build. Pay once when you send.</p>
      </div>
    </form>
  )
}
