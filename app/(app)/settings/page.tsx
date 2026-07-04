import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { formatPence } from '@/lib/money'
import { UNLOCK_AMOUNT } from '@/lib/stripe'
import { BASE_DOMAIN, BRAND_NAME } from '@/lib/brand'
import { SiteSettingsForm } from './settings-form'
import { UnlockCard } from './unlock-card'

export const metadata = { title: `Settings · ${BRAND_NAME}` }

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ unlocked?: string }>
}) {
  const { unlocked } = await searchParams
  const site = await getPrimarySite()
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('sites')
    .select('title, slug, status, is_unlocked, rsvp_deadline_default, theme')
    .eq('id', site!.siteId)
    .maybeSingle()
  const templateKey = (row?.theme as { template?: string } | null)?.template ?? 'editorial-gold'

  return (
    <div className="mx-auto max-w-[1060px] px-6 py-10">
      <PageHeader eyebrow="Settings" title="Your site" />

      {unlocked === '1' && (
        <p className="mb-6 rounded-md border border-ok/40 bg-ok-soft px-4 py-3 text-sm text-ink">
          Payment received — publishing and invite sending are unlocked. Thank you!
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-line bg-surface p-7 shadow-card">
          <p className="eyebrow mb-4">Site</p>
          <SiteSettingsForm
            title={row?.title ?? ''}
            deadlineDefault={row?.rsvp_deadline_default ?? null}
            templateKey={templateKey}
          />
          <p className="mt-5 border-t border-line pt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
            Address: {row?.slug}.{BASE_DOMAIN} · Status: {row?.status}
          </p>
        </section>

        <UnlockCard
          unlocked={!!row?.is_unlocked}
          priceDisplay={formatPence(UNLOCK_AMOUNT)}
        />
      </div>
    </div>
  )
}
