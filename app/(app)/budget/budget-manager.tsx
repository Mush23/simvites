'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatPence } from '@/lib/money'
import { createBudgetItem, updateBudgetItem, archiveBudgetItem } from './actions'
import { askConfirm, notify } from '@/components/ui/overlays'

export interface Option { id: string; name: string }
export interface BudgetItemRow {
  id: string
  label: string
  category: string
  event_id: string | null
  vendor_id: string | null
  estimated_amount: number
  actual_amount: number | null
  paid_amount: number
  status: string
  due_date: string | null
}

const CATEGORIES = ['Venue', 'Catering', 'Decor', 'Photography', 'Attire', 'Beauty', 'Music & entertainment', 'Transport', 'Stationery', 'Gifts', 'Ceremony', 'Other']
const STATUS_LABEL: Record<string, string> = {
  estimated: 'Estimated', deposit_paid: 'Deposit paid', part_paid: 'Part paid', paid: 'Paid',
}
const pounds = (p: number | null) => (p == null ? '' : (p / 100).toFixed(2))

export function BudgetManager({ items, events, vendors }: {
  items: BudgetItemRow[]; events: Option[]; vendors: Option[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const refresh = () => startTransition(() => router.refresh())
  const [error, setError] = useState<string | null>(null)

  async function onAdd(fd: FormData) {
    setError(null)
    const res = await createBudgetItem(fd)
    if (res?.error) setError(res.error); else refresh()
  }

  const categories = [...new Set(items.map((i) => i.category))]

  return (
    <div className="space-y-8">
      {/* Add line */}
      <form action={onAdd} className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
        <Text name="label" label="New line" placeholder="Mandap & florals" required w="w-52" />
        <label className="block">
          <span className="eyebrow mb-1.5 block">Category</span>
          <select name="category" defaultValue="Decor" className="rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <Select name="event_id" label="Event" options={events} />
        <Select name="vendor_id" label="Vendor" options={vendors} />
        <Text name="estimated_amount" label="Estimated £" placeholder="2500.00" w="w-28" />
        <button type="submit" className="rounded-md bg-accent px-5 py-2.5 font-semibold text-white transition-transform hover:-translate-y-px">
          Add
        </button>
        {error && <p className="w-full text-sm text-bad">{error}</p>}
      </form>

      {items.length === 0 && (
        <div className="rounded-card border border-dashed border-line bg-paper-2 p-10 text-center text-ink-2">
          No budget lines yet.
        </div>
      )}

      {categories.map((cat) => (
        <section key={cat}>
          <p className="eyebrow mb-3">{cat}</p>
          <div className="space-y-2.5">
            {items.filter((i) => i.category === cat).map((i) => (
              <BudgetRow key={i.id} item={i} events={events} vendors={vendors} onChanged={refresh} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function BudgetRow({ item, events, vendors, onChanged }: {
  item: BudgetItemRow; events: Option[]; vendors: Option[]; onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventName = events.find((e) => e.id === item.event_id)?.name
  const vendorName = vendors.find((v) => v.id === item.vendor_id)?.name
  const balance = Math.max(0, (item.actual_amount ?? item.estimated_amount) - item.paid_amount)

  async function onSave(fd: FormData) {
    setError(null)
    const res = await updateBudgetItem(item.id, fd)
    if (res?.error) setError(res.error)
    else { setOpen(false); onChanged() }
  }

  return (
    <div className="rounded-card border border-line bg-surface shadow-card">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left">
        <div className="min-w-0">
          <p className="font-medium text-ink">{item.label}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            {[eventName, vendorName].filter(Boolean).join(' · ') || 'unlinked'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-ink-2">
            {formatPence(item.paid_amount)} paid · {formatPence(balance)} due
          </span>
          <span className="font-display text-lg nums text-ink">{formatPence(item.actual_amount ?? item.estimated_amount)}</span>
          <span className="rounded-pill bg-paper-2 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
            {STATUS_LABEL[item.status] ?? item.status}
          </span>
        </div>
      </button>

      {open && (
        <form action={onSave} className="flex flex-wrap items-end gap-3 border-t border-line p-4">
          <Text name="label" label="Label" defaultValue={item.label} required w="w-48" />
          <label className="block">
            <span className="eyebrow mb-1.5 block">Category</span>
            <select name="category" defaultValue={item.category} className="rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent">
              {[...new Set([item.category, ...CATEGORIES])].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <Select name="event_id" label="Event" options={events} defaultValue={item.event_id ?? ''} />
          <Select name="vendor_id" label="Vendor" options={vendors} defaultValue={item.vendor_id ?? ''} />
          <Text name="estimated_amount" label="Estimated £" defaultValue={pounds(item.estimated_amount)} w="w-26" />
          <Text name="actual_amount" label="Actual £" defaultValue={pounds(item.actual_amount)} w="w-26" />
          <Text name="paid_amount" label="Paid £" defaultValue={pounds(item.paid_amount)} w="w-26" />
          <label className="block">
            <span className="eyebrow mb-1.5 block">Status</span>
            <select name="status" defaultValue={item.status} className="rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent">
              {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <Text name="due_date" label="Due" type="date" defaultValue={item.due_date ?? ''} w="w-36" />
          <button type="submit" className="rounded-md bg-accent px-4 py-2.5 font-semibold text-white">Save</button>
          <button type="button"
            onClick={async () => {
              if (!(await askConfirm({ title: 'Archive this budget line?', body: 'It leaves your totals but is never deleted.' }))) return
              await archiveBudgetItem(item.id); notify('Budget line archived'); onChanged()
            }}
            className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3 hover:text-bad">
            Archive
          </button>
          {error && <p className="w-full text-sm text-bad">{error}</p>}
        </form>
      )}
    </div>
  )
}

function Text({ name, label, defaultValue, placeholder, required, type = 'text', w = 'w-40' }: {
  name: string; label: string; defaultValue?: string; placeholder?: string; required?: boolean; type?: string; w?: string
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} required={required}
        className={`${w} rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent`} />
    </label>
  )
}

function Select({ name, label, options, defaultValue }: {
  name: string; label: string; options: Option[]; defaultValue?: string
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      <select name={name} defaultValue={defaultValue ?? ''}
        className="max-w-44 rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent">
        <option value="">—</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  )
}
