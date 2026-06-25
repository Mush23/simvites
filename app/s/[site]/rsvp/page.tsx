import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import {
  getPublishedSite,
  lookupHouseholdContext,
  lookupHouseholdContextById,
} from '@/lib/rsvp'
import { GUEST_COOKIE, verifyGuestSession } from '@/lib/guest-session'
import { CodeForm } from './code-form'
import { RsvpForm } from './rsvp-form'

export const metadata = { title: 'RSVP' }

export default async function RsvpPage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>
  searchParams: Promise<{ code?: string }>
}) {
  const { site: slug } = await params
  const { code } = await searchParams

  const site = await getPublishedSite(slug)
  if (!site) notFound()

  // Prefer the HttpOnly guest-session cookie set by /i/<token>; fall back to a
  // typed invite code.
  const guest = verifyGuestSession((await cookies()).get(GUEST_COOKIE)?.value)
  let ctx = guest && guest.siteId === site.id
    ? await lookupHouseholdContextById(site, guest.householdId)
    : null
  if (!ctx && code) ctx = await lookupHouseholdContext(site, code)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-2xl px-6 py-20">
        <div className="text-center">
          <p className="mb-3 text-[0.7rem] uppercase tracking-luxury text-gold-ink">
            {site.name}
          </p>
          <h1 className="font-heading text-4xl font-light sm:text-5xl">RSVP</h1>
        </div>

        {!ctx && !code && (
          <div className="mt-12">
            <p className="mb-8 text-center text-muted-foreground">
              Please enter the invitation code from your personal invitation to continue.
            </p>
            <CodeForm />
          </div>
        )}

        {!ctx && code && (
          <div className="mt-12 text-center">
            <p className="text-destructive">
              We couldn&apos;t find an invitation for that code. Please check and try again.
            </p>
            <div className="mt-8">
              <CodeForm initial={code} />
            </div>
          </div>
        )}

        {ctx && <RsvpForm siteId={site.id} ctx={ctx} />}
      </main>
    </div>
  )
}
