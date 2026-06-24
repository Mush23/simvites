'use client'

import { useActionState, useState } from 'react'
import { createSiteAction, type CreateSiteState } from './actions'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'simvites.co.uk'

const initial: CreateSiteState = {}

export function CreateSiteForm() {
  const [state, formAction, pending] = useActionState(createSiteAction, initial)
  const [slug, setSlug] = useState('')

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="mb-1.5 block text-[0.7rem] uppercase tracking-wide-soft text-muted-foreground">
          Site name
        </span>
        <input
          name="name"
          type="text"
          required
          placeholder="Maharshi & Simran"
          className="w-full border-b border-border bg-transparent pb-2 text-foreground outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[0.7rem] uppercase tracking-wide-soft text-muted-foreground">
          Web address
        </span>
        <div className="flex items-baseline gap-1">
          <input
            name="slug"
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="maharshi-simran"
            className="min-w-0 flex-1 border-b border-border bg-transparent pb-2 text-foreground outline-none"
          />
          <span className="shrink-0 text-sm text-muted-foreground">.{ROOT_DOMAIN}</span>
        </div>
      </label>

      <p className="text-sm text-muted-foreground">
        Starts from the <span className="text-gold-ink">Editorial Luxe</span> template —
        a four-event South Asian wedding you can edit next.
      </p>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <button
        id="create-site-submit"
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-primary px-6 py-3 text-[0.7rem] uppercase tracking-wide-soft text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Creating…' : 'Create site'}
      </button>
    </form>
  )
}
