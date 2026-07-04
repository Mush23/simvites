'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { parsePounds } from '@/lib/money'

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? '').trim()
  return v === '' ? null : v
}

export async function createBudgetItem(formData: FormData) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const label = str(formData, 'label')
  const category = str(formData, 'category')
  if (!label || !category) return { error: 'Label and category are required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('budget_items').insert({
    site_id: site.siteId,
    label,
    category,
    event_id: str(formData, 'event_id'),
    vendor_id: str(formData, 'vendor_id'),
    estimated_amount: parsePounds(str(formData, 'estimated_amount')) ?? 0,
  })
  if (error) return { error: error.message }
  revalidatePath('/budget')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function updateBudgetItem(itemId: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('budget_items')
    .update({
      label: str(formData, 'label') ?? 'Untitled',
      category: str(formData, 'category') ?? 'Other',
      event_id: str(formData, 'event_id'),
      vendor_id: str(formData, 'vendor_id'),
      estimated_amount: parsePounds(str(formData, 'estimated_amount')) ?? 0,
      actual_amount: parsePounds(str(formData, 'actual_amount')),
      paid_amount: parsePounds(str(formData, 'paid_amount')) ?? 0,
      status: str(formData, 'status') ?? 'estimated',
      due_date: str(formData, 'due_date'),
    })
    .eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath('/budget')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function archiveBudgetItem(itemId: string) {
  const supabase = await createClient()
  await supabase.from('budget_items').update({ archived_at: new Date().toISOString() }).eq('id', itemId)
  revalidatePath('/budget')
  return { ok: true }
}
