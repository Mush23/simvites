import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { TaskManager, type TaskRow, type Option } from './task-manager'
import { BRAND_NAME } from '@/lib/brand'

export const metadata = { title: `Tasks · ${BRAND_NAME}` }

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

  const all = tasks ?? []
  const done = all.filter((t) => t.status === 'done').length
  const open = all.length - done
  const today = new Date().toISOString().slice(0, 10)
  const overdue = all.filter((t) => t.status !== 'done' && t.due_date && t.due_date < today).length
  const pct = all.length ? Math.round((done / all.length) * 100) : 0

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <PageHeader
        eyebrow="Tasks"
        title="What needs doing"
        description={`${open} open task${open === 1 ? '' : 's'}. Link tasks to events and vendors so nothing lives in two places.`}
      />

      {/* V2: progress at a glance — planning should feel like winning */}
      {all.length > 0 && (
        <div className="mb-6 rounded-card border border-line bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[13.5px] font-semibold text-ink">
              {done} of {all.length} done <span className="font-mono text-[12px] text-ink-3">· {pct}%</span>
            </p>
            {overdue > 0 ? (
              <span className="rounded-full bg-bad-soft px-2.5 py-0.5 text-[11.5px] font-medium text-bad">
                {overdue} overdue — worth a look
              </span>
            ) : (
              <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-[11.5px] font-medium text-ok">
                Nothing overdue ✓
              </span>
            )}
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
            {/* Progress is never the brand accent — Phase 1 token. Missed on
                this bar because it is a bare div, not a StatCard. */}
            <div className={`h-full rounded-full transition-[width] duration-500 ${
              pct >= 100 ? 'bg-progress-done' : 'bg-progress-fill'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      <TaskManager
        tasks={(tasks ?? []) as TaskRow[]}
        events={(events ?? []) as Option[]}
        vendors={(vendors ?? []) as Option[]}
      />
    </div>
  )
}
