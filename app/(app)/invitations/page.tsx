import { createClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetch-all'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { emailConfigured } from '@/lib/email'
import { InvitationsClient, type HouseholdInviteRow } from './invitations-client'

export const metadata = { title: 'Invitations · Occasio' }

export default async function InvitationsPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()

  const siteId = site!.siteId
  const [households, guests, tokens, { data: sends }] =
    await Promise.all([
      fetchAll<{ id: string; name: string }>(() =>
        supabase.from('households').select('id, name').eq('site_id', siteId).is('archived_at', null).order('created_at')),
      fetchAll<{ household_id: string; email: string | null }>(() =>
        supabase.from('guests').select('household_id, email').eq('site_id', siteId).is('archived_at', null)),
      fetchAll<{ household_id: string; revoked: boolean }>(() =>
        supabase.from('guest_access_tokens').select('household_id, revoked').eq('site_id', siteId)),
      supabase.from('activity_log').select('entity_id, created_at').eq('site_id', siteId)
        .eq('verb', 'sent_invites').order('created_at', { ascending: false }),
    ])
  const { data: opens } = await supabase.from('activity_log')
    .select('entity_id, created_at').eq('site_id', site!.siteId)
    .eq('verb', 'invite_opened').order('created_at', { ascending: false })

  const rows: HouseholdInviteRow[] = (households ?? []).map((h) => {
    const hhGuests = (guests ?? []).filter((g) => g.household_id === h.id)
    return {
      id: h.id,
      name: h.name,
      guestCount: hhGuests.length,
      emailCount: new Set(hhGuests.map((g) => g.email).filter(Boolean)).size,
      activeLinks: (tokens ?? []).filter((t) => t.household_id === h.id && !t.revoked).length,
      lastSentAt: (sends ?? []).find((s) => s.entity_id === h.id)?.created_at ?? null,
      lastOpenedAt: (opens ?? []).find((o) => o.entity_id === h.id)?.created_at ?? null,
    }
  })

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
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
