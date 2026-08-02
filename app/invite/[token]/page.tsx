import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hashToken } from '@/lib/tokens'
import { BRAND_NAME } from '@/lib/brand'
import { invitedAddressMatches } from '@/lib/collaborators'
import { AcceptButton } from './accept-button'

export const metadata: Metadata = { title: `Invitation — ${BRAND_NAME}`, robots: { index: false } }

interface Peek {
  org_name: string | null
  invited_email: string | null
  status: 'pending' | 'accepted' | 'revoked' | 'expired' | 'not_found'
}

/**
 * Collaborator invitation landing page (M1).
 *
 * The link on its own grants nothing. It identifies an invitation; accepting
 * requires being signed in as the address that was invited, which the RPC
 * enforces. This page's job is to make the state legible before anyone clicks.
 *
 * `peek_collaborator_invitation` is security-definer and returns a MASKED
 * email, so an unauthenticated visitor holding the link learns which org
 * invited them and roughly which inbox — never a harvestable address.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const admin = createAdminClient()
  const { data } = await admin.rpc('peek_collaborator_invitation', { p_token_hash: hashToken(token) })
  const peek = (Array.isArray(data) ? data[0] : data) as Peek | undefined
  const status = peek?.status ?? 'not_found'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (status !== 'pending') {
    return (
      <Shell title={TITLES[status]}>
        <p>{BODIES[status]}</p>
        <Actions>
          <Link href={user ? '/dashboard' : '/login'} className="rounded-md bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90">
            {user ? 'Go to your dashboard' : `Sign in to ${BRAND_NAME}`}
          </Link>
        </Actions>
      </Shell>
    )
  }

  const org = peek?.org_name ?? 'a wedding'

  // Not signed in — send them to sign in and come straight back here.
  if (!user) {
    return (
      <Shell title={`You've been invited to help plan ${org}.`}>
        <p>
          Accepting gives you full access to plan alongside them — the guest list, the
          schedule, the budget and the website.
        </p>
        <p className="mt-3">
          Sign in as <strong>{peek?.invited_email ?? 'the invited address'}</strong>{' '}
          to accept. If you don&rsquo;t have an account yet, you can create one with
          that address.
        </p>
        <Actions>
          <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className="rounded-md bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90">
            Sign in to continue
          </Link>
        </Actions>
        <p className="mt-5 text-[12.5px] text-ink-3">
          Nothing has been created for you, and nothing will be until you accept.
        </p>
      </Shell>
    )
  }

  // Signed in as somebody else. The RPC would refuse anyway; say so plainly
  // here rather than letting them click into an error.
  const signedInAs = (user.email ?? '').toLowerCase()
  const invitedMask = peek?.invited_email ?? ''
  const looksMismatched = !invitedAddressMatches(invitedMask, signedInAs)

  if (looksMismatched) {
    return (
      <Shell title="This invitation is for a different address.">
        <p>
          You&rsquo;re signed in as <strong>{user.email}</strong>, but this invitation was
          sent to <strong>{invitedMask}</strong>.
        </p>
        <p className="mt-3">
          Sign out and sign back in with the invited address, or ask them to send a new
          invitation to <strong>{user.email}</strong>.
        </p>
        <Actions>
          <form action={async () => { 'use server'; redirect('/auth/signout') }}>
            <button type="submit" className="rounded-md bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90">Sign out</button>
          </form>
          <Link href="/dashboard" className="rounded-md border border-line px-4 py-2.5 text-[13px] font-medium text-ink transition-colors hover:border-line-2">Back to my dashboard</Link>
        </Actions>
      </Shell>
    )
  }

  return (
    <Shell title={`You've been invited to help plan ${org}.`}>
      <p>
        Accepting gives you full access to plan alongside them — the guest list, the
        schedule, the budget and the website. You can be removed at any time by the
        person who owns the wedding.
      </p>
      <p className="mt-3">
        You&rsquo;re signed in as <strong>{user.email}</strong>.
      </p>
      <AcceptButton token={token} />
      <p className="mt-5 text-[12.5px] text-ink-3">
        Not expecting this? Close this page and nothing happens — the invitation
        expires on its own.
      </p>
    </Shell>
  )
}

const TITLES: Record<Peek['status'], string> = {
  pending: '',
  accepted: 'That invitation has already been accepted.',
  revoked: 'That invitation has been withdrawn.',
  expired: 'That invitation has expired.',
  not_found: 'That invitation link is not valid.',
}

const BODIES: Record<Peek['status'], string> = {
  pending: '',
  accepted: 'If it was you, the wedding is already in your account. If it was not, ask the couple to check who has access.',
  revoked: 'The person who sent it has since withdrawn it. Ask them to send a new one if you think that is a mistake.',
  expired: 'Invitations are valid for a limited time. Ask them to send a fresh one — it only takes a moment.',
  not_found: 'Double-check you copied the whole link from the email. Links are long, and mail clients sometimes break them across lines.',
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-16 text-ink">
      <div className="w-full max-w-[480px] rounded-card border border-line bg-surface p-8 shadow-card">
        <p className="eyebrow mb-3">{BRAND_NAME}</p>
        <h1 className="text-[22px] font-semibold leading-tight tracking-tight">{title}</h1>
        <div className="mt-4 text-[14px] leading-relaxed text-ink-2">{children}</div>
      </div>
    </main>
  )
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex flex-wrap items-center gap-3">{children}</div>
}
