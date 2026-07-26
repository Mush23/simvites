import { createClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetch-all'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { SurfaceTabs, INVITE_TABS } from '@/components/app/surface-tabs'
import { smsConfigured, whatsappConfigured } from '@/lib/twilio'
import { Inbox, type Thread, type ThreadMessage } from './inbox'
import { BRAND_NAME } from '@/lib/brand'

export const metadata = { title: `Messages · ${BRAND_NAME}` }

export default async function MessagesPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()

  const siteId = site!.siteId
  const [households, guests, messages] = await Promise.all([
    fetchAll<{ id: string; name: string }>(() =>
      supabase.from('households').select('id, name').eq('site_id', siteId).is('archived_at', null).order('name')),
    fetchAll<{ id: string; household_id: string; phone: string | null }>(() =>
      supabase.from('guests').select('id, household_id, phone').eq('site_id', siteId).is('archived_at', null)),
    fetchAll<{ id: string; household_id: string | null; direction: string; channel: string; body: string; status: string; created_at: string }>(() =>
      supabase.from('messages').select('id, household_id, direction, channel, body, status, created_at').eq('site_id', siteId).order('created_at')),
  ])

  const phoneByHh = new Map<string, boolean>()
  for (const g of guests ?? []) if (g.phone) phoneByHh.set(g.household_id, true)

  const msgsByHh = new Map<string, ThreadMessage[]>()
  for (const m of messages ?? []) {
    if (!m.household_id) continue
    const arr = msgsByHh.get(m.household_id) ?? []
    arr.push({ id: m.id, direction: m.direction as 'in' | 'out', channel: m.channel, body: m.body, status: m.status, createdAt: m.created_at })
    msgsByHh.set(m.household_id, arr)
  }

  // Threads: households with a phone OR existing messages, most-recent first.
  const threads: Thread[] = (households ?? [])
    .map((h) => {
      const msgs = msgsByHh.get(h.id) ?? []
      return {
        householdId: h.id, name: h.name, hasPhone: phoneByHh.has(h.id),
        messages: msgs,
        lastAt: msgs.length ? msgs[msgs.length - 1].createdAt : null,
        unreadIn: msgs.filter((m) => m.direction === 'in').length,
      }
    })
    .filter((t) => t.hasPhone || t.messages.length > 0)
    .sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? '') || a.name.localeCompare(b.name))

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <SurfaceTabs tabs={INVITE_TABS} />
      <PageHeader
        eyebrow="Invites & messaging"
        title="Talk to your guests"
        description="One thread per household by SMS or WhatsApp — send reminders and see replies in the same place, no group chats."
      />
      <Inbox threads={threads} unlocked={site!.isUnlocked} sms={smsConfigured()} whatsapp={whatsappConfigured()} />
    </div>
  )
}
