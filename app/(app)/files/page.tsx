import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { PageHeader } from '@/components/app/ui'
import { FileManager, type FileRow, type Option } from './file-manager'

export const metadata = { title: 'Files · Occasio' }

export default async function FilesPage() {
  const site = await getPrimarySite()
  const supabase = await createClient()

  const [{ data: files }, { data: events }, { data: vendors }] = await Promise.all([
    supabase.from('files').select('id, name, kind, event_id, vendor_id, created_at')
      .eq('site_id', site!.siteId).order('created_at', { ascending: false }),
    supabase.from('events').select('id, name').eq('site_id', site!.siteId).is('archived_at', null).order('sort_order'),
    supabase.from('vendors').select('id, name').eq('site_id', site!.siteId).is('archived_at', null).order('name'),
  ])

  return (
    <div className="mx-auto max-w-[1060px] px-6 py-10">
      <PageHeader
        eyebrow="Files"
        title="Contracts & documents"
        description="Stored privately; downloads use short-lived signed links. Link each file to its event or vendor."
      />
      <FileManager
        files={(files ?? []) as FileRow[]}
        events={(events ?? []) as Option[]}
        vendors={(vendors ?? []) as Option[]}
      />
    </div>
  )
}
