'use client'

// Vendor recommendations — platform-curated suppliers by category, each with
// a real couple/planner mention and a one-click "Add to my vendors" that
// drops it into the pipeline as Shortlisted.

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Check, Plus, ExternalLink, Quote } from 'lucide-react'
import { addFromDirectory } from './actions'
import { notify } from '@/components/ui/overlays'

export interface DirectoryVendor {
  id: string
  category: string
  name: string
  tagline: string | null
  blurb: string | null
  location: string | null
  price_band: string | null
  website: string | null
  instagram: string | null
  rating: number | null
  featured: boolean
  /** E4: partner perk, e.g. "10% off through Milestones" + optional promo code. */
  discount?: string | null
  promo_code?: string | null
  mentions: { quote: string; author: string | null; source: string | null }[]
}

const CATEGORY_LABELS: Record<string, string> = {
  catering: 'Catering', dj: 'DJ', decor: 'Decor', coordinator: 'Coordinator',
  entertainment: 'Entertainment', photography: 'Photography', florals: 'Florals',
  mehndi: 'Mehndi', transport: 'Transport', cake: 'Cake',
}

export function Recommendations({ vendors, addedIds }: {
  vendors: DirectoryVendor[]
  addedIds: string[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [cat, setCat] = useState<string>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(() => new Set(addedIds))

  const categories = useMemo(
    () => [...new Set(vendors.map((v) => v.category))].sort((a, b) => (CATEGORY_LABELS[a] ?? a).localeCompare(CATEGORY_LABELS[b] ?? b)),
    [vendors],
  )
  const shown = cat === 'all' ? vendors : vendors.filter((v) => v.category === cat)

  async function add(v: DirectoryVendor) {
    setBusy(v.id)
    const res = await addFromDirectory(v.id)
    setBusy(null)
    if (res.error) { notify(res.error, { tone: 'warn' }); return }
    setAdded((s) => new Set(s).add(v.id))
    notify(res.already ? `${v.name} is already in your vendors` : `${v.name} added to your vendors`, {
      actionLabel: 'View', onAction: () => router.push(`/vendors/${res.id}`),
    })
    startTransition(() => router.refresh())
  }

  return (
    <section className="mt-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setCat('all')}
          className={`rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors ${
            cat === 'all' ? 'bg-ink text-paper' : 'border border-line text-ink-2 hover:border-line-2'}`}>
          All
        </button>
        {categories.map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)}
            className={`rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors ${
              cat === c ? 'bg-ink text-paper' : 'border border-line text-ink-2 hover:border-line-2'}`}>
            {CATEGORY_LABELS[c] ?? c}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {shown.map((v) => {
          const isAdded = added.has(v.id)
          const mention = v.mentions[0]
          return (
            <article key={v.id} className="flex flex-col rounded-card border border-line bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                      {CATEGORY_LABELS[v.category] ?? v.category}
                    </span>
                    {v.featured && (
                      <span className="rounded-full px-2 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-[0.06em]"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}>
                        Editor&rsquo;s pick
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-[15px] font-semibold tracking-tight text-ink">{v.name}</h3>
                  {v.tagline && <p className="text-[12.5px] text-ink-2">{v.tagline}</p>}
                </div>
                {v.rating != null && (
                  <span className="flex shrink-0 items-center gap-1 rounded-md bg-surface-2 px-1.5 py-1 font-mono text-[11px] font-semibold text-ink">
                    <Star size={11} strokeWidth={0} fill="var(--warn)" className="text-warn" />{v.rating.toFixed(1)}
                  </span>
                )}
              </div>

              {v.blurb && <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">{v.blurb}</p>}

              {/* E4: partner perk — the reason to book through the platform */}
              {v.discount && (
                <p className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg border border-accent-line bg-accent-soft px-3 py-2 text-[12.5px] font-medium text-accent-ink">
                  🎁 {v.discount}
                  {v.promo_code && (
                    <button type="button" title="Copy code"
                      onClick={() => { navigator.clipboard.writeText(v.promo_code!).catch(() => {}); notify(`Code ${v.promo_code} copied`) }}
                      className="rounded border border-accent-line bg-surface px-2 py-0.5 font-mono text-[11px] tracking-wide hover:border-accent">
                      {v.promo_code} ⧉
                    </button>
                  )}
                </p>
              )}

              <p className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-ink-3">
                {v.location && <span>{v.location}</span>}
                {v.price_band && <span className="font-mono">{v.price_band}</span>}
              </p>

              {mention && (
                <blockquote className="mt-3 rounded-lg border border-line bg-paper px-3.5 py-3">
                  <Quote size={13} strokeWidth={1.7} className="mb-1 text-ink-3" />
                  <p className="text-[12.5px] italic leading-relaxed text-ink">&ldquo;{mention.quote}&rdquo;</p>
                  {(mention.author || mention.source) && (
                    <p className="mt-1.5 text-[11px] text-ink-3">
                      {mention.author}{mention.author && mention.source ? ' · ' : ''}
                      {mention.source && <span className="text-ok">{mention.source}</span>}
                    </p>
                  )}
                </blockquote>
              )}

              <div className="mt-4 flex items-center gap-2">
                {isAdded ? (
                  <span className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px] font-medium text-ink-2">
                    <Check size={14} strokeWidth={2} className="text-ok" /> In your vendors
                  </span>
                ) : (
                  <button type="button" onClick={() => add(v)} disabled={busy === v.id}
                    className="rounded-md flex items-center gap-1.5 bg-accent px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
                    <Plus size={14} strokeWidth={2} /> {busy === v.id ? 'Adding…' : 'Add to my vendors'}
                  </button>
                )}
                {v.website && (
                  <a href={v.website} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-ink hover:border-line-2">
                    Website <ExternalLink size={12} strokeWidth={1.7} className="text-ink-3" />
                  </a>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
