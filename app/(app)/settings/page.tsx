import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { formatPence } from '@/lib/money'
import { getUnlockPrice } from '@/lib/pricing'
import { BASE_DOMAIN, BRAND_NAME } from '@/lib/brand'
import { SiteSettingsForm } from './settings-form'
import { UnlockCard } from './unlock-card'
import { PasswordForm } from '@/components/auth/password-form'

export const metadata = { title: `Settings · ${BRAND_NAME}` }

async function VersionList({ siteId }: { siteId: string }) {
  const supabase = await createClient()
  const { data: versions } = await supabase
    .from('published_versions')
    .select('id, published_at')
    .eq('site_id', siteId)
    .order('published_at', { ascending: false })
    .limit(10)
  if (!versions?.length) return <p className="text-sm text-ink-3">No published versions yet.</p>
  return (
    <ul className="space-y-2">
      {versions.map((v, i) => (
        <li key={v.id} className="flex items-center justify-between gap-3 border-b border-line pb-2 text-sm last:border-0">
          <span className="text-ink">
            {new Date(v.published_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
            {i === 0 && <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.14em] text-accent-ink">live</span>}
          </span>
          {i > 0 && (
            <form action={async () => { 'use server'; await (await import('./actions')).restoreVersion(v.id) }}>
              <button type="submit" title="Copy this version back into your draft"
                className="rounded-md border border-line bg-paper-2 px-3 py-1.5 text-xs hover:border-accent">
                Restore to draft
              </button>
            </form>
          )}
        </li>
      ))}
    </ul>
  )
}

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
  const price = await getUnlockPrice()

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
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
            templates={(await import('@/lib/templates/registry')).listTemplates()}
          />
          <p className="mt-5 border-t border-line pt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
            Address: {row?.slug}.{BASE_DOMAIN} · Status: {row?.status}
          </p>
        </section>

        <UnlockCard
          unlocked={!!row?.is_unlocked}
          priceDisplay={formatPence(price.amount)}
        />

        <section className="rounded-card border border-line bg-surface p-7 shadow-card">
          <p className="eyebrow mb-2">Version history</p>
          <p className="mb-4 text-sm text-ink-2">
            Every publish is kept forever. Restore any version into your draft, then publish again
            when you&apos;re happy — your live site never changes until you do.
          </p>
          <VersionList siteId={site!.siteId} />
        </section>

        <section className="rounded-card border border-line bg-surface p-7 shadow-card">
          <p className="eyebrow mb-2">Collaborators</p>
          <p className="mb-4 text-sm text-ink-2">
            Weddings are planned together. Add your partner, a parent or your planner —
            they get full access to plan, and sign in with a magic link (no password to share).
          </p>
          <form action={async (fd) => { 'use server'; await (await import('./actions')).addCollaborator(fd) }}
            className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="eyebrow mb-1.5 block">Their email</span>
              <input name="email" type="email" required placeholder="partner@example.com"
                className="w-64 rounded-md border border-line bg-paper-2 px-3.5 py-3 text-ink outline-none focus:border-accent" />
            </label>
            <button type="submit" title="They'll sign in via the Email link tab on the login page"
              className="rounded-md bg-accent px-5 py-3 font-semibold text-white">
              Add collaborator
            </button>
          </form>
        </section>

        <section className="rounded-card border border-line bg-surface p-7 shadow-card">
          <p className="eyebrow mb-2">Account security</p>
          <p className="mb-4 text-sm text-ink-2">
            Change the password you sign in with. Forgot it? Use &ldquo;Forgot password?&rdquo; on the
            login page and we&apos;ll email you a reset link.
          </p>
          <div className="max-w-sm">
            <PasswordForm cta="Change password" />
          </div>
        </section>
      </div>
    </div>
  )
}
