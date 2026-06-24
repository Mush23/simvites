import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { siteUrl } from '@/lib/tenant'
import { CreateSiteForm } from './create-site-form'

export const metadata = { title: 'Dashboard · Simvites' }

interface SiteRow {
  id: string
  name: string
  slug: string
  status: string
  event_type: string
}

export default async function DashboardPage() {
  const user = await getUser()
  const supabase = await createClient()

  // Resolve (or lazily create) the user's organization.
  const { data: orgId } = await supabase.rpc('ensure_personal_org', {
    p_name: user?.email ? `${user.email.split('@')[0]} — organization` : 'My organization',
  })

  let sites: SiteRow[] = []
  if (orgId) {
    const { data } = await supabase
      .from('sites')
      .select('id, name, slug, status, event_type')
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    sites = data ?? []
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
        {/* Sites list */}
        <section>
          <h1 className="font-heading text-3xl font-light">Your sites</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sites.length === 0
              ? 'No sites yet — create your first one alongside.'
              : `${sites.length} site${sites.length === 1 ? '' : 's'}.`}
          </p>

          <ul className="mt-8 space-y-4">
            {sites.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-5"
              >
                <div>
                  <p className="font-heading text-xl font-light text-card-foreground">
                    {s.name}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {s.slug}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN}
                    <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[0.6rem] uppercase tracking-wide-soft">
                      {s.status}
                    </span>
                  </p>
                </div>
                <a
                  href={siteUrl(s.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[0.7rem] uppercase tracking-wide-soft text-gold-ink underline underline-offset-4"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Create panel */}
        <section className="rounded-lg border border-border bg-secondary/30 p-7">
          <p className="mb-1 text-[0.7rem] uppercase tracking-luxury text-gold-ink">
            New
          </p>
          <h2 className="mb-6 font-heading text-2xl font-light">Create a site</h2>
          <CreateSiteForm />
        </section>
      </div>

      <p className="mt-12 text-center text-sm text-muted-foreground">
        Want to see the template first?{' '}
        <Link href="/preview" className="text-gold-ink underline underline-offset-4">
          Preview Editorial Luxe
        </Link>
      </p>
    </main>
  )
}
