'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { parsePounds } from '@/lib/money'

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? '').trim()
  return v === '' ? null : v
}

export async function createVendor(formData: FormData) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const name = str(formData, 'name')
  const category = str(formData, 'category')
  if (!name || !category) return { error: 'Name and category are required.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vendors')
    .insert({ site_id: site.siteId, name, category })
    .select('id')
    .single()
  if (error) return { error: error.message }
  revalidatePath('/vendors')
  redirect(`/vendors/${data.id}`)
}

export async function updateVendor(vendorId: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('vendors')
    .update({
      name: str(formData, 'name') ?? 'Untitled vendor',
      category: str(formData, 'category') ?? 'Other',
      contact_name: str(formData, 'contact_name'),
      email: str(formData, 'email'),
      phone: str(formData, 'phone'),
      website: str(formData, 'website'),
      instagram: str(formData, 'instagram'),
      status: str(formData, 'status') ?? 'shortlisted',
      quote_amount: parsePounds(str(formData, 'quote_amount')),
      contracted_amount: parsePounds(str(formData, 'contracted_amount')),
      notes: str(formData, 'notes'),
    })
    .eq('id', vendorId)
  if (error) return { error: error.message }
  revalidatePath('/vendors')
  revalidatePath(`/vendors/${vendorId}`)
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function archiveVendor(vendorId: string) {
  const supabase = await createClient()
  await supabase.from('vendors').update({ archived_at: new Date().toISOString() }).eq('id', vendorId)
  revalidatePath('/vendors')
  redirect('/vendors')
}

/** Toggle which events this vendor covers (vendor_events). */
export async function setVendorEvent(vendorId: string, eventId: string, covered: boolean) {
  const supabase = await createClient()
  if (covered) {
    const { error } = await supabase.from('vendor_events').upsert(
      { vendor_id: vendorId, event_id: eventId },
      { onConflict: 'vendor_id,event_id', ignoreDuplicates: true },
    )
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('vendor_events').delete()
      .eq('vendor_id', vendorId).eq('event_id', eventId)
    if (error) return { error: error.message }
  }
  revalidatePath(`/vendors/${vendorId}`)
  return { ok: true }
}
