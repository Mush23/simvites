import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * Signed-URL download (handoff §5 storage policy). The row read uses the
 * caller's session — RLS proves site membership — and only then does the
 * service role mint a short-lived signed URL for the private object.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorised', { status: 401 })

  const { data: row } = await supabase.from('files').select('storage_path, name').eq('id', fileId).maybeSingle()
  if (!row) return new Response('Not found', { status: 404 })

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from('files')
    .createSignedUrl(row.storage_path, 60, { download: row.name })
  if (error || !data?.signedUrl) return new Response('Could not sign URL', { status: 500 })

  return NextResponse.redirect(data.signedUrl)
}
