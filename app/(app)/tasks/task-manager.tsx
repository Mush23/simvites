'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTask, setTaskStatus, archiveTask, addStarterPack } from './actions'
import { askConfirm, notify } from '@/components/ui/overlays'
import { restoreArchived } from '@/app/(app)/actions'
import { X } from 'lucide-react'

export interface Option { id: string; name: string }
export interface TaskRow {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'normal' | 'high'
  due_date: string | null
  event_id: string | null
  vendor_id: string | null
}

export function TaskManager({ tasks, events, vendors }: {
  tasks: TaskRow[]; events: Option[]; vendors: Option[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const refresh = () => startTransition(() => router.refresh())
  const [error, setError] = useState<string | null>(null)
  const [packNote, setPackNote] = useState<string | null>(null)

  async function onAdd(fd: FormData) {
    setError(null)
    const res = await createTask(fd)
    if (res?.error) setError(res.error); else refresh()
  }

  async function onStarterPack() {
    const res = await addStarterPack()
    if (res?.error) setPackNote(res.error)
    else { setPackNote(`Added ${(res as { added: number }).added} starter tasks.`); refresh() }
  }

  const openTasks = tasks.filter((t) => t.status !== 'done')
  const doneTasks = tasks.filter((t) => t.status === 'done')

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-card border border-line bg-surface p-5 shadow-card">
        <form action={onAdd} className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="eyebrow mb-1.5 block">New task</span>
            <input name="title" required placeholder="Chase caterer for tasting date"
              className="w-64 rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent" />
          </label>
          <Select name="event_id" label="Event" options={events} />
          <Select name="vendor_id" label="Vendor" options={vendors} />
          <label className="block">
            <span className="eyebrow mb-1.5 block">Due</span>
            <input name="due_date" type="date"
              className="rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent" />
          </label>
          <label className="block">
            <span className="eyebrow mb-1.5 block">Priority</span>
            <select name="priority" defaultValue="normal"
              className="rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent">
              <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
            </select>
          </label>
          <button type="submit" className="rounded-md bg-accent px-5 py-2.5 font-semibold text-white">
            Add
          </button>
        </form>
        <div className="text-right">
          <button type="button" onClick={onStarterPack}
            className="rounded-md border border-line bg-paper-2 px-4 py-2.5 text-sm transition-colors hover:border-accent">
            Add starter checklist
          </button>
          {packNote && <p className="mt-1.5 text-xs text-ink-3">{packNote}</p>}
        </div>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}

      <TaskList title={`Open · ${openTasks.length}`} tasks={openTasks} events={events} vendors={vendors} onChanged={refresh} />
      {doneTasks.length > 0 && (
        <TaskList title={`Done · ${doneTasks.length}`} tasks={doneTasks} events={events} vendors={vendors} onChanged={refresh} />
      )}
      {tasks.length === 0 && (
        <div className="rounded-card border border-dashed border-line bg-paper-2 p-10 text-center text-ink-2">
          Nothing yet — add a task or load the starter checklist.
        </div>
      )}
    </div>
  )
}

function TaskList({ title, tasks, events, vendors, onChanged }: {
  title: string; tasks: TaskRow[]; events: Option[]; vendors: Option[]; onChanged: () => void
}) {
  if (!tasks.length) return null
  return (
    <section>
      <p className="eyebrow mb-3">{title}</p>
      <div className="space-y-2">
        {tasks.map((t) => (
          <TaskItem key={t.id} task={t} events={events} vendors={vendors} onChanged={onChanged} />
        ))}
      </div>
    </section>
  )
}

function TaskItem({ task, events, vendors, onChanged }: {
  task: TaskRow; events: Option[]; vendors: Option[]; onChanged: () => void
}) {
  const done = task.status === 'done'
  const overdue = !done && task.due_date && new Date(task.due_date) < new Date()
  const linked = [
    events.find((e) => e.id === task.event_id)?.name,
    vendors.find((v) => v.id === task.vendor_id)?.name,
  ].filter(Boolean).join(' · ')

  async function toggle() {
    await setTaskStatus(task.id, done ? 'todo' : 'done')
    onChanged()
  }

  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-3.5 shadow-card">
      <input type="checkbox" checked={done} onChange={toggle}
        aria-label={`Mark "${task.title}" ${done ? 'not done' : 'done'}`}
        className="h-5 w-5 shrink-0 accent-[var(--accent)]" />
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${done ? 'text-ink-3 line-through' : 'text-ink'}`}>{task.title}</p>
        {linked && <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">{linked}</p>}
      </div>
      {task.priority === 'high' && !done && (
        <span className="rounded-pill bg-bad-soft px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-bad">high</span>
      )}
      {task.due_date && (
        <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${overdue ? 'text-bad' : 'text-ink-3'}`}>
          {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
      )}
      <button type="button" onClick={async () => {
        if (!(await askConfirm({ title: 'Archive this task?', body: 'It moves out of your lists but is never deleted.' }))) return
        await archiveTask(task.id)
        notify('Task archived', {
          actionLabel: 'Undo',
          onAction: () => { restoreArchived('tasks', task.id).then(onChanged) },
        })
        onChanged()
      }}
        aria-label={`Archive ${task.title}`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-bad-soft hover:text-bad"><X size={14} strokeWidth={1.7} /></button>
    </div>
  )
}

function Select({ name, label, options }: { name: string; label: string; options: Option[] }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      <select name={name} defaultValue=""
        className="max-w-40 rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent">
        <option value="">—</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  )
}
