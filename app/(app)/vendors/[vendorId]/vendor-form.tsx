'use client'

import { useState } from 'react'
import { updateVendor, archiveVendor } from '../actions'
import { askConfirm, notify } from '@/components/ui/overlays'

interface VendorRow {
  id: string
  name: string
  category: string
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  instagram: string | null
  status: string
  quote_amount: number | null
  contracted_amount: number | null
  notes: string | null
}

const pounds = (pence: number | null) => (pence == null ? '' : (pence / 100).toFixed(2))

export function VendorForm({ vendor }: { vendor: VendorRow }) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function action(fd: FormData) {
    setStatus('saving'); setError(null)
    const res = await updateVendor(vendor.id, fd)
    if (res?.error) { setError(res.error); setStatus('error') } else setStatus('saved')
  }

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" defaultValue={vendor.name} required />
        <Field label="Category" name="category" defaultValue={vendor.category} required />
        <label className="block">
          <span className="eyebrow mb-1.5 block">Pipeline status</span>
          <select name="status" defaultValue={vendor.status}
            className="w-full rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent">
            <option value="shortlisted">Shortlisted</option>
            <option value="contacted">Contacted</option>
            <option value="quote_in">Quote in</option>
            <option value="booked">Booked</option>
            <option value="declined">Declined</option>
          </select>
        </label>
        <Field label="Contact name" name="contact_name" defaultValue={vendor.contact_name ?? ''} />
        <Field label="Email" name="email" type="email" defaultValue={vendor.email ?? ''} />
        <Field label="Phone" name="phone" defaultValue={vendor.phone ?? ''} />
        <Field label="Website" name="website" defaultValue={vendor.website ?? ''} />
        <Field label="Instagram" name="instagram" defaultValue={vendor.instagram ?? ''} />
        <Field label="Quote (£)" name="quote_amount" defaultValue={pounds(vendor.quote_amount)} placeholder="4500.00" />
        <Field label="Contracted (£)" name="contracted_amount" defaultValue={pounds(vendor.contracted_amount)} placeholder="4200.00" />
      </div>
      <label className="block">
        <span className="eyebrow mb-1.5 block">Notes</span>
        <textarea name="notes" rows={3} defaultValue={vendor.notes ?? ''}
          className="w-full rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent" />
      </label>
      <div className="flex items-center gap-4">
        <button type="submit"
          className="rounded-md bg-accent px-6 py-3 font-semibold text-white transition-transform hover:-translate-y-px">
          Save vendor
        </button>
        {status === 'saved' && <span className="eyebrow text-accent-ink">Saved</span>}
        {status === 'saving' && <span className="eyebrow">Saving…</span>}
        {error && <span className="text-sm text-bad">{error}</span>}
        <button type="button"
          onClick={async () => {
            if (!(await askConfirm({ title: `Archive ${vendor.name}?`, body: 'Their budget lines stay; the vendor leaves your pipeline.' }))) return
            notify('Vendor archived'); archiveVendor(vendor.id)
          }}
          className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3 hover:text-bad">
          Archive
        </button>
      </div>
    </form>
  )
}

function Field({ label, name, defaultValue, type = 'text', required, placeholder }: {
  label: string; name: string; defaultValue: string; type?: string; required?: boolean; placeholder?: string
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} required={required} placeholder={placeholder}
        className="w-full rounded-md border border-line bg-paper-2 px-3 py-2.5 text-ink outline-none focus:border-accent" />
    </label>
  )
}
