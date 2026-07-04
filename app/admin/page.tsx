import { notFound } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { PageHeader, StatCard } from '@/components/app/ui'
import { adminToggleUnlock, adminArchiveSite, adminExtendExpiry } from './actions'
import { ResetButton } from './reset-button'

export const metadata = { title: 'Platform admin · Occasio' }

export default async function PlatformAdminPage() {
  const admin = await requirePlatformAdmin()
  if (!admin) notFound() // invisible to everyone else

  const db = createAdminClient()
  const [{ data: sites }, { data: profiles }, { count: orgs }, { count: responses }] = await Promise.all([
    db.from('sites').select('id, title, slug, status, is_unlocked, expires_at, archived_at, created_at').order('created_at', { ascending: false }),
    db.from('profiles').select('id, email, created_at').order('created_at', { ascending: false }).limit(100),
    db.from('organisations').select('id', { count: 'exact', head: true }),
    db.from('responses').select('id', { count: 'exact', head: true }),
  ])
  const fmt = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-GB') : '—')
  interface SiteRow { id: string; title: string; slug: string; status: string; is_unlocked: boolean; expires_at: string | null; archived_at: string | null }
  interface ProfileRow { id: string; email: string; created_at: string }
  const siteRows = (sites ?? []) as SiteRow[]
  const profileRows = (profiles ?? []) as ProfileRow[]

  return (
    <div className="mx-auto max-w-[1060px] px-6 py-10">
      <PageHeader eyebrow="Platform admin" title="Mission control"
        description={`Signed in as ${admin.email}. Everything here is platform-wide — handle with care.`} />

      <div className="grid gap-5 sm:grid-cols-4">
        <StatCard label="Organisations" value={orgs ?? 0} />
        <StatCard label="Sites" value={sites?.length ?? 0} />
        <StatCard label="Users" value={profiles?.length ?? 0} />
        <StatCard label="RSVPs" value={responses ?? 0} />
      </div>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-2xl text-ink">Sites</h2>
        <div className="space-y-2">
          {siteRows.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
              <div className="min-w-44">
                <p className="text-sm font-medium text-ink">{s.title}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                  {s.slug} — {s.status}{s.archived_at ? ', ARCHIVED' : ''} — expires {fmt(s.expires_at)}
                </p>
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                <form action={async () => { 'use server'; await adminToggleUnlock(s.id, !s.is_unlocked) }}>
                  <button type="submit" title="Comp or revoke the paid unlock (a 100% discount)"
                    className={`px-3 py-1.5 text-xs ${s.is_unlocked ? 'border border-line bg-paper-2 text-ink-3' : 'bg-accent font-semibold text-white'}`}>
                    {s.is_unlocked ? 'Revoke unlock' : 'Comp unlock'}
                  </button>
                </form>
                <form action={async () => { 'use server'; await adminExtendExpiry(s.id, 18) }}>
                  <button type="submit" title="Extend hosting 18 months from today"
                    className="border border-line bg-paper-2 px-3 py-1.5 text-xs hover:border-accent">+18 months</button>
                </form>
                <form action={async () => { 'use server'; await adminArchiveSite(s.id, !s.archived_at) }}>
                  <button type="submit" title="Archived sites go offline publicly; all data is kept"
                    className="border border-line bg-paper-2 px-3 py-1.5 text-xs hover:border-accent">
                    {s.archived_at ? 'Restore' : 'Archive'}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-2xl text-ink">Users</h2>
        <div className="space-y-2">
          {profileRows.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-3.5 shadow-card">
              <span className="text-sm text-ink">{p.email}
                <span className="ml-2 font-mono text-[9px] uppercase text-ink-3">joined {fmt(p.created_at)}</span></span>
              <ResetButton userId={p.id} />
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-3">
          Percentage discount codes run through Stripe Coupons once live keys are connected —
          create them in the Stripe dashboard; the checkout picks them up with promotion codes enabled.
        </p>
      </section>
    </div>
  )
}
