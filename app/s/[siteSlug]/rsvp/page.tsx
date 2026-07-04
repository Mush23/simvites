import { getGuestRsvpContext } from '@/lib/guest-rsvp'
import { getPublishedSnapshot } from '@/lib/public-site'
import { RsvpFlow } from './rsvp-flow'

export const metadata = { title: 'RSVP' }

const LINK_MESSAGES: Record<string, string> = {
  invalid: 'That invitation link isn’t valid. Please check the link from your invitation, or ask your hosts for a fresh one.',
  revoked: 'That invitation link has been replaced. Please use the newest link your hosts sent you.',
  expired: 'That invitation link has expired. Please ask your hosts for a fresh one.',
}

export default async function GuestRsvpPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteSlug: string }>
  searchParams: Promise<{ link?: string }>
}) {
  const { siteSlug } = await params
  const { link } = await searchParams

  const ctx = await getGuestRsvpContext(siteSlug)

  if (!ctx) {
    const snap = await getPublishedSnapshot(siteSlug)
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6 text-center text-ink">
        <div className="max-w-md">
          <p className="eyebrow mb-3">{snap?.title ?? 'RSVP'}</p>
          <h1 className="font-display text-4xl">Your invitation</h1>
          <p className="mt-5 leading-relaxed text-ink-2">
            {LINK_MESSAGES[link ?? ''] ??
              'This page opens from the personal link in your invitation. Follow that link and you’ll land right here, ready to RSVP.'}
          </p>
        </div>
      </div>
    )
  }

  return <RsvpFlow ctx={ctx} />
}
