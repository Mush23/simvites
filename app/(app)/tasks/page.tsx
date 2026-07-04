import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { TaskManager, type TaskRow, type Option } from './task-manager'

export const metadata = { title: 'Tasks · Occasio' }

export default async function TasksPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()

  const [{ data: tasks }, { data: events }, { data: vendors }] = await Promise.all([
    supabase.from('tasks').select('id, title, status, priority, due_date, event_id, vendor_id')
      .eq('site_id', site!.siteId).is('archived_at', null)
      .order('status').order('due_date', { nullsFirst: false }).order('created_at'),
    supabase.from('events').select('id, name').eq('site_id', site!.siteId).is('archived_at', null).order('sort_order'),
    supabase.from('vendors').select('id, name').eq('site_id', site!.siteId).is('archived_at', null).order('name'),
  ])

  const open = (tasks ?? []).filter((t) => t.status !== 'done').length

  return (
    <div className="mx-auto max-w-[1060px] px-6 py-10">
      <PageHeader
        eyebrow="Tasks"
        title="What needs doing"
        description={`${open} open task${open === 1 ? '' : 's'}. Link tasks to events and vendors so nothing lives in two places.`}
      />
      <TaskManager
        tasks={(tasks ?? []) as TaskRow[]}
        events={(events ?? []) as Option[]}
        vendors={(vendors ?? []) as Option[]}
      />
    </div>
  )
}
