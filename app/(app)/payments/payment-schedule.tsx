'use client'

// Payment schedule — vendor instalments grouped by month, with add form,
// mark-paid (syncs the linked budget line) and delete. Overdue rows glow
// red, due-soon rows amber.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Bell, Plus, X, CalendarClock } from 'lucide-react'
import { formatPence } from '@/lib/money'
import { createPayment, setPaymentPaid, deletePayment } from './actions'
import { askConfirm, notify } from '@/components/ui/overlays'

export interface Opt { id: string; name: string }
export interface PaymentRow {
  id: string
  label: string
  amount: number
  dueDate: string
  status: 'scheduled' | 'paid'
  paidOn: string | null
  vendorId: string | null
  vendorName: string | null
  budgetItemId: string | null
  note: string | null
  overdue: boolean
  dueSoon: boolean
}

const monthKey = (d: string) => d.slice(0, 7)
const monthLabel = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
const dayLabel = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export function PaymentSchedule({ rows, vendors, budgetItems }: {
  rows: PaymentRow[]; vendors: Opt[]; budgetItems: Opt[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const refresh = () => startTransition(() => router.refresh())
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onAdd(fd: FormData) {
    setBusy(true); setError(null)
    const res = await createPayment(fd)
    setBusy(false)
    if (res.error) setError(res.error)
    else { setShowAdd(false); notify('Payment scheduled'); refresh() }
  }

  async function togglePaid(r: PaymentRow) {
    const res = await setPaymentPaid(r.id, r.status !== 'paid')
    if (res.error) notify(res.error, { tone: 'warn' })
    else { notify(r.status === 'paid' ? 'Marked as not paid' : `${r.label} marked paid`); refresh() }
  }

  async function onDelete(r: PaymentRow) {
    if (!(await askConfirm({ title: `Delete "${r.label}"?`, body: 'This removes it from your schedule.', confirmLabel: 'Delete' }))) return
    await deletePayment(r.id); notify('Payment removed'); refresh()
  }

  // Group by month, scheduled first (by date), paid rows fall to the bottom.
  const scheduled = rows.filter((r) => r.status === 'scheduled')
  const paid = rows.filter((r) => r.status === 'paid')
  const months = [...new Set(scheduled.map((r) => monthKey(r.dueDate)))].sort()

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <button type="button" onClick={() => setShowAdd((s) => !s)}
          className="flex items-center gap-1.5 bg-accent px-3.5 py-2 text-[13px] font-semibold text-white">
          <Plus size={14} strokeWidth={2} /> Schedule a payment
        </button>
      </div>

      {showAdd && (
        <form action={onAdd} className="mb-8 grid gap-3 rounded-card border border-line bg-surface p-5 shadow-card sm:grid-cols-2 lg:grid-cols-3">
          <Field name="label" label="What is it?" placeholder="Deposit, Balance, Final payment" required />
          <Field name="amount" label="Amount £" placeholder="1500.00" required />
          <Field name="due_date" label="Due date" type="date" required />
          <Select name="vendor_id" label="Vendor" options={vendors} />
          <Select name="budget_item_id" label="Budget line (keeps totals in sync)" options={budgetItems} />
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-ink-2">Remind me</span>
            <select name="remind_days_before" defaultValue="7"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-accent">
              <option value="3">3 days before</option>
              <option value="7">1 week before</option>
              <option value="14">2 weeks before</option>
              <option value="30">1 month before</option>
            </select>
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
            <button type="submit" disabled={busy}
              className="bg-accent px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
              {busy ? 'Saving…' : 'Add to schedule'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)}
              className="border border-line px-4 py-2 text-[13px] font-medium text-ink">Cancel</button>
            {error && <p className="text-[13px] text-bad">{error}</p>}
          </div>
        </form>
      )}

      {rows.length === 0 && (
        <div className="rounded-card border border-dashed border-line bg-paper-2 p-10 text-center text-ink-2">
          <CalendarClock size={22} strokeWidth={1.5} className="mx-auto mb-3 text-ink-3" />
          No payments scheduled yet. Add your vendor deposits and balances so nothing sneaks up on you.
        </div>
      )}

      {months.map((m) => {
        const inMonth = scheduled.filter((r) => monthKey(r.dueDate) === m).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        const monthTotal = inMonth.reduce((n, r) => n + r.amount, 0)
        return (
          <section key={m} className="mb-7">
            <div className="mb-2.5 flex items-baseline justify-between">
              <p className="microlabel">{monthLabel(inMonth[0].dueDate)}</p>
              <p className="font-mono text-[11px] text-ink-3">{formatPence(monthTotal)}</p>
            </div>
            <div className="space-y-2">
              {inMonth.map((r) => <PaymentCard key={r.id} r={r} onPaid={togglePaid} onDelete={onDelete} />)}
            </div>
          </section>
        )
      })}

      {paid.length > 0 && (
        <section className="mt-4">
          <p className="microlabel mb-2.5">Paid · {paid.length}</p>
          <div className="space-y-2">
            {paid.map((r) => <PaymentCard key={r.id} r={r} onPaid={togglePaid} onDelete={onDelete} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function PaymentCard({ r, onPaid, onDelete }: {
  r: PaymentRow; onPaid: (r: PaymentRow) => void; onDelete: (r: PaymentRow) => void
}) {
  const isPaid = r.status === 'paid'
  return (
    <div className={`flex items-center gap-3 rounded-card border bg-surface p-3.5 shadow-card ${
      r.overdue ? 'border-bad/40' : r.dueSoon ? 'border-warn/40' : 'border-line'}`}>
      <button type="button" onClick={() => onPaid(r)}
        aria-label={isPaid ? `Mark ${r.label} not paid` : `Mark ${r.label} paid`}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
          isPaid ? 'border-ok bg-ok text-white' : 'border-line-2 text-transparent hover:border-ok'}`}>
        <Check size={13} strokeWidth={2.5} />
      </button>

      <div className="min-w-0 flex-1">
        <p className={`text-[13.5px] font-medium ${isPaid ? 'text-ink-3 line-through' : 'text-ink'}`}>
          {r.label}{r.vendorName && <span className="font-normal text-ink-3"> · {r.vendorName}</span>}
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-[11.5px] text-ink-3">
          {isPaid && r.paidOn
            ? <span className="text-ok">Paid {dayLabel(r.paidOn)}</span>
            : <span className={r.overdue ? 'font-medium text-bad' : r.dueSoon ? 'font-medium text-warn' : ''}>
                {r.overdue ? 'Overdue · ' : ''}Due {dayLabel(r.dueDate)}
              </span>}
          {!isPaid && r.dueSoon && <Bell size={11} strokeWidth={1.8} className="text-warn" />}
          {r.budgetItemId && <span className="rounded bg-surface-2 px-1.5 py-px font-mono text-[9px] text-ink-3">linked to budget</span>}
        </p>
      </div>

      <span className={`font-mono text-[15px] font-semibold nums ${isPaid ? 'text-ink-3' : 'text-ink'}`}>{formatPence(r.amount)}</span>
      <button type="button" onClick={() => onDelete(r)} aria-label={`Delete ${r.label}`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-bad-soft hover:text-bad">
        <X size={14} strokeWidth={1.7} />
      </button>
    </div>
  )
}

function Field({ name, label, placeholder, type = 'text', required }: {
  name: string; label: string; placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-ink-2">{label}</span>
      <input name={name} type={type} placeholder={placeholder} required={required}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-accent" />
    </label>
  )
}

function Select({ name, label, options }: { name: string; label: string; options: Opt[] }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-ink-2">{label}</span>
      <select name={name} defaultValue=""
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-accent">
        <option value="">—</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  )
}
