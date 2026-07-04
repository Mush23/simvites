'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? '').trim()
  return v === '' ? null : v
}

export async function createTask(formData: FormData) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const title = str(formData, 'title')
  if (!title) return { error: 'Task title is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('tasks').insert({
    site_id: site.siteId,
    title,
    event_id: str(formData, 'event_id'),
    vendor_id: str(formData, 'vendor_id'),
    due_date: str(formData, 'due_date'),
    priority: str(formData, 'priority') ?? 'normal',
  })
  if (error) return { error: error.message }
  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function setTaskStatus(taskId: string, status: 'todo' | 'in_progress' | 'done') {
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId)
  if (error) return { error: error.message }
  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function archiveTask(taskId: string) {
  const supabase = await createClient()
  await supabase.from('tasks').update({ archived_at: new Date().toISOString() }).eq('id', taskId)
  revalidatePath('/tasks')
  return { ok: true }
}

// Curated starter checklist for a multi-event South Asian wedding.
// Neutral-luxe stance: no religious assumptions; hosts rename/delete freely.
const STARTER_TASKS: { title: string; priority?: 'high' | 'normal' }[] = [
  { title: 'Confirm final guest numbers with every venue', priority: 'high' },
  { title: 'Book caterer & agree per-head price', priority: 'high' },
  { title: 'Book photographer & videographer', priority: 'high' },
  { title: 'Arrange outfits for each event' },
  { title: 'Book mehndi artist' },
  { title: 'Book DJ / live music for the main evening' },
  { title: 'Plan décor & florals per event' },
  { title: 'Arrange guest transport between venues' },
  { title: 'Confirm ceremony officiant & requirements', priority: 'high' },
  { title: 'Order invitations & send personal links' },
  { title: 'Build the day-of timeline with all vendors' },
  { title: 'Arrange accommodation block for out-of-town guests' },
]

export async function addStarterPack() {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  const supabase = await createClient()

  // Skip titles that already exist so the pack is idempotent.
  const { data: existing } = await supabase
    .from('tasks').select('title').eq('site_id', site.siteId).is('archived_at', null)
  const have = new Set((existing ?? []).map((t) => t.title.toLowerCase()))
  const rows = STARTER_TASKS
    .filter((t) => !have.has(t.title.toLowerCase()))
    .map((t) => ({ site_id: site.siteId, title: t.title, priority: t.priority ?? 'normal' }))

  if (rows.length) {
    const { error } = await supabase.from('tasks').insert(rows)
    if (error) return { error: error.message }
  }
  revalidatePath('/tasks')
  return { ok: true, added: rows.length }
}
