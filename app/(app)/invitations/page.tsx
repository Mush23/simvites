import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { emailConfigured } from '@/lib/email'
import { InvitationsClient, type HouseholdInviteRow } from './invitations-client'

export const metadata = { title: 'Invitations · Occasio' }

export default async function InvitationsPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()

  const [{ data: households }, { data: guests }, { data: tokens }, { data: sends }] =
    await Promise.all([
      supabase.from('households').select('id, name').eq('site_id', site!.siteId)
        .is('archived_at', null).order('created_at'),
      supabase.from('guests').select('household_id, email').eq('site_id', site!.siteId).is('archived_at', null),
      supabase.from('guest_access_tokens').select('household_id, revoked').eq('site_id', site!.siteId),
      supabase.from('activity_log').select('entity_id, created_at').eq('site_id', site!.siteId)
        .eq('verb', 'sent_invites').order('created_at', { ascending: false }),
    ])

  const rows: HouseholdInviteRow[] = (households ?? []).map((h) => {
    const hhGuests = (guests ?? []).filter((g) => g.household_id === h.id)
    return {
      id: h.id,
      name: h.name,
      guestCount: hhGuests.length,
      emailCount: new Set(hhGuests.map((g) => g.email).filter(Boolean)).size,
      activeLinks: (tokens ?? []).filter((t) => t.household_id === h.id && !t.revoked).length,
      lastSentAt: (sends ?? []).find((s) => s.entity_id === h.id)?.created_at ?? null,
    }
  })

  return (
    <div className="mx-auto max-w-[1060px] px-6 py-10">
      <PageHeader
        eyebrow="Invitations"
        title="Personal links"
        description="Each household gets a private link. Only the link's hash is ever stored — copy it when it appears, or email it directly."
      />
      {!emailConfigured() && (
        <p className="mb-6 rounded-md border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-ink">
          Email isn&apos;t connected yet (no Resend key) — links still work; copy and share them
          by WhatsApp or message. Add <span className="font-mono text-xs">RESEND_API_KEY</span> to enable sending.
        </p>
      )}
      <InvitationsClient rows={rows} />
    </div>
  )
}
