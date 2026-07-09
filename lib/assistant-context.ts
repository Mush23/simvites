import { createClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/supabase/fetch-all'
import { formatPence } from '@/lib/money'

/**
 * Build a compact, factual snapshot of the couple's wedding for the AI
 * assistant's system prompt. Numbers only — the model answers from these,
 * so it gives real figures instead of generic checklist advice.
 */
export async function buildAssistantContext(siteId: string, siteTitle: string): Promise<string> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const [
    { data: events }, guests, households, invitations,
    responses, answers, { data: questions },
    { data: vendors }, { data: budget }, { data: tasks }, { data: payments },
  ] = await Promise.all([
    supabase.from('events').select('id, name, starts_at, venue_name, capacity').eq('site_id', siteId).is('archived_at', null).order('starts_at'),
    // Guest-scaled sets: page past the 1000-row cap so the AI cites exact figures.
    fetchAll<{ id: string; full_name: string; household_id: string; is_child: boolean }>(() =>
      supabase.from('guests').select('id, full_name, household_id, is_child').eq('site_id', siteId).is('archived_at', null)),
    fetchAll<{ id: string; name: string }>(() =>
      supabase.from('households').select('id, name').eq('site_id', siteId).is('archived_at', null)),
    fetchAll<{ guest_id: string; event_id: string }>(() =>
      supabase.from('invitations').select('guest_id, event_id').eq('site_id', siteId)),
    fetchAll<{ guest_id: string; event_id: string; status: string }>(() =>
      supabase.from('responses').select('guest_id, event_id, status').eq('site_id', siteId)),
    fetchAll<{ question_id: string; value: unknown }>(() =>
      supabase.from('rsvp_answers').select('question_id, value').eq('site_id', siteId)),
    supabase.from('rsvp_questions').select('id, label, type').eq('site_id', siteId).is('archived_at', null),
    supabase.from('vendors').select('name, category, status, contracted_amount, quote_amount').eq('site_id', siteId).is('archived_at', null),
    supabase.from('budget_items').select('label, estimated_amount, actual_amount, paid_amount').eq('site_id', siteId).is('archived_at', null),
    supabase.from('tasks').select('title, status, due_date, priority').eq('site_id', siteId).is('archived_at', null),
    supabase.from('vendor_payments').select('label, amount, due_date, status').eq('site_id', siteId).is('archived_at', null),
  ])

  const guestIds = new Set((guests ?? []).map((g) => g.id))
  const gById = new Map((guests ?? []).map((g) => [g.id, g]))
  const eventById = new Map((events ?? []).map((e) => [e.id, e]))
  const lines: string[] = []

  lines.push(`WEDDING: ${siteTitle}`)
  lines.push(`Today: ${today}`)

  // Events + per-event RSVP
  lines.push('\nEVENTS & RSVP:')
  for (const e of events ?? []) {
    const invited = (invitations ?? []).filter((i) => i.event_id === e.id && guestIds.has(i.guest_id))
    const resp = (responses ?? []).filter((r) => r.event_id === e.id && guestIds.has(r.guest_id))
    const yes = resp.filter((r) => r.status === 'attending').length
    const no = resp.filter((r) => r.status === 'declined').length
    const pending = Math.max(0, invited.length - yes - no)
    lines.push(`- ${e.name}${e.starts_at ? ` (${e.starts_at.slice(0, 10)})` : ''}${e.venue_name ? ` at ${e.venue_name}` : ''}: ${invited.length} invited, ${yes} attending, ${no} declined, ${pending} not replied${e.capacity ? `, capacity ${e.capacity}` : ''}`)
  }

  // Guests
  const children = (guests ?? []).filter((g) => g.is_child).length
  lines.push(`\nGUESTS: ${(guests ?? []).length} people across ${(households ?? []).length} households (${children} children).`)

  // Non-responders by household
  const respondedHh = new Set((responses ?? []).map((r) => gById.get(r.guest_id)?.household_id).filter(Boolean))
  const noReply = (households ?? []).filter((h) => !respondedHh.has(h.id)).map((h) => h.name)
  if (noReply.length) lines.push(`Households with NO response yet (${noReply.length}): ${noReply.slice(0, 40).join(', ')}${noReply.length > 40 ? '…' : ''}.`)

  // Answer roll-ups (meals, dietary)
  const qById = new Map((questions ?? []).map((q) => [q.id, q]))
  const rollups = new Map<string, Map<string, number>>()
  for (const a of answers ?? []) {
    const q = qById.get(a.question_id); if (!q) continue
    const counts = rollups.get(q.label) ?? new Map<string, number>()
    const vals = Array.isArray(a.value) ? (a.value as unknown[]) : [a.value]
    for (const v of vals) { const k = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v); counts.set(k, (counts.get(k) ?? 0) + 1) }
    rollups.set(q.label, counts)
  }
  if (rollups.size) {
    lines.push('\nRSVP ANSWERS:')
    for (const [label, counts] of rollups) lines.push(`- ${label}: ${[...counts].map(([k, n]) => `${k} ${n}`).join(', ')}`)
  }

  // Budget
  const est = (budget ?? []).reduce((n, b) => n + (b.actual_amount ?? b.estimated_amount ?? 0), 0)
  const paid = (budget ?? []).reduce((n, b) => n + (b.paid_amount ?? 0), 0)
  lines.push(`\nBUDGET: ${formatPence(est)} estimated, ${formatPence(paid)} paid, ${formatPence(Math.max(0, est - paid))} outstanding across ${(budget ?? []).length} lines.`)

  // Vendors
  const booked = (vendors ?? []).filter((v) => v.status === 'booked')
  lines.push(`VENDORS: ${(vendors ?? []).length} total, ${booked.length} booked${booked.length ? ` (${booked.map((v) => `${v.name} — ${v.category}`).slice(0, 20).join(', ')})` : ''}.`)

  // Payments due
  const duePay = (payments ?? []).filter((p) => p.status === 'scheduled')
  const overdue = duePay.filter((p) => p.due_date < today)
  if (duePay.length) {
    lines.push(`\nUPCOMING PAYMENTS (${duePay.length}): ${duePay.slice(0, 20).map((p) => `${p.label} ${formatPence(p.amount)} due ${p.due_date}${p.due_date < today ? ' [OVERDUE]' : ''}`).join('; ')}.`)
    if (overdue.length) lines.push(`${overdue.length} payment(s) OVERDUE.`)
  }

  // Tasks
  const open = (tasks ?? []).filter((t) => t.status !== 'done')
  const overdueTasks = open.filter((t) => t.due_date && t.due_date < today)
  lines.push(`\nTASKS: ${open.length} open${overdueTasks.length ? `, ${overdueTasks.length} overdue` : ''}.`)
  void eventById

  return lines.join('\n')
}
