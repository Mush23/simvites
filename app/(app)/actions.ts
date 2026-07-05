'use server'

import { revalidatePath } from 'next/cache'
import { getPrimarySite } from '@/lib/workspace'
import { publishSnapshot } from '@/lib/publish'

/** Header Publish (overhaul): snapshot the saved drafts from any module. */
export async function publishSiteNow(): Promise<{ ok?: true; error?: string; locked?: true }> {
  const workspace = await getPrimarySite()
  if (!workspace) return { error: 'No site.' }
  if (!workspace.isUnlocked) return { error: 'locked', locked: true }
  const res = await publishSnapshot(workspace.siteId, 'Published from the header')
  if ('error' in res && res.error) return { error: res.error }
  revalidatePath('/', 'layout')
  return { ok: true }
}
