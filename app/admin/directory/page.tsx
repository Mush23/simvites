import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { DirectoryManager, type DirectoryRow } from './directory-manager'

export const metadata = { title: 'Vendor directory · Admin' }

// E4: the founder's supplier directory — add partners and their exclusive
// discounts here; every couple sees them under Vendors → Recommended.
export default async function AdminDirectoryPage() {
  const admin = await requirePlatformAdmin()
  if (!admin) notFound()

  const db = createAdminClient()
  const { data: rows } = await db
    .from('vendor_directory')
    .select('id, category, name, tagline, blurb, location, price_band, website, instagram, email, phone, discount, promo_code, featured, archived_at')
    .order('category').order('name')

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-8">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="microlabel">Platform admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Vendor directory</h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Curated suppliers every couple sees under Vendors → Recommended. Add partner discounts
            here — they appear as a badge with the promo code on the couple&apos;s side.
          </p>
        </div>
        <Link href="/admin" className="text-[13px] text-ink-3 hover:text-ink">← Customers</Link>
      </div>
      <DirectoryManager rows={(rows ?? []) as DirectoryRow[]} />
    </div>
  )
}
