'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { parsePounds } from '@/lib/money'

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? '').trim()
  return v === '' ? null : v
}

/** Add a scheduled instalment for a vendor, optionally linked to a budget line. */
export async function createPayment(formData: FormData) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }

  const label = str(formData, 'label') ?? 'Payment'
  const amount = parsePounds(str(formData, 'amount'))
  const dueDate = str(formData, 'due_date')
  if (amount == null || amount <= 0) return { error: 'Enter an amount.' }
  if (!dueDate) return { error: 'Choose a due date.' }

  const supabase = await createClient()
  const { error } = await supabase.from('vendor_payments').insert({
    site_id: site.siteId,
    vendor_id: str(formData, 'vendor_id'),
    budget_item_id: str(formData, 'budget_item_id'),
    label,
    amount,
    due_date: dueDate,
    remind_days_before: Number(str(formData, 'remind_days_before') ?? '7') || 7,
    note: str(formData, 'note'),
  })
  if (error) return { error: error.message }
  revalidatePath('/payments')
  revalidatePath('/budget')
  return { ok: true }
}

/**
 * Mark a scheduled payment paid (or un-paid). When linked to a budget line,
 * bump/lower that line's paid_amount so the schedule and budget always agree.
 */
export async function setPaymentPaid(paymentId: string, paid: boolean) {
  const supabase = await createClient()
  const { data: pay } = await supabase
    .from('vendor_payments')
    .select('id, amount, status, budget_item_id')
    .eq('id', paymentId)
    .maybeSingle()
  if (!pay) return { error: 'Payment not found.' }
  if ((pay.status === 'paid') === paid) return { ok: true } // no change

  const { error } = await supabase
    .from('vendor_payments')
    .update({ status: paid ? 'paid' : 'scheduled', paid_on: paid ? new Date().toISOString().slice(0, 10) : null })
    .eq('id', paymentId)
  if (error) return { error: error.message }

  // Keep the linked budget line's paid_amount in step.
  if (pay.budget_item_id) {
    const { data: item } = await supabase
      .from('budget_items').select('paid_amount, estimated_amount, actual_amount, status')
      .eq('id', pay.budget_item_id).maybeSingle()
    if (item) {
      const nextPaid = Math.max(0, (item.paid_amount ?? 0) + (paid ? pay.amount : -pay.amount))
      const target = item.actual_amount ?? item.estimated_amount ?? 0
      const nextStatus = nextPaid <= 0 ? 'estimated' : nextPaid >= target && target > 0 ? 'paid' : 'part_paid'
      await supabase.from('budget_items')
        .update({ paid_amount: nextPaid, status: nextStatus })
        .eq('id', pay.budget_item_id)
    }
  }

  revalidatePath('/payments')
  revalidatePath('/budget')
  return { ok: true }
}

export async function deletePayment(paymentId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('vendor_payments').update({ archived_at: new Date().toISOString() }).eq('id', paymentId)
  if (error) return { error: error.message }
  revalidatePath('/payments')
  return { ok: true }
}
