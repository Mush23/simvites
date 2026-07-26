'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'

/**
 * Apply a template to the site.
 *
 * Reads the existing theme and spreads it, rather than replacing the object.
 * The old settings-form path wrote `theme: { template }` wholesale, which
 * silently dropped everything else the couple had chosen — initials, accent,
 * fonts, backdrop, colour mode. Choosing a new look should change the look,
 * not reset the site.
 */
export async function applyTemplate(formData: FormData) {
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }

  const { getTemplate } = await import('@/lib/templates/registry')
  const requested = String(formData.get('template') ?? '')
  const template = getTemplate(requested)
  // getTemplate falls back to the default for an unknown key, so an invalid
  // submission would silently reset the look. Say so instead.
  if (template.key !== requested) return { error: 'That template does not exist.' }

  const supabase = await createClient()
  const { data: row } = await supabase
    .from('sites').select('theme').eq('id', site.siteId).maybeSingle()
  const theme = (row?.theme ?? {}) as Record<string, unknown>

  const { error } = await supabase
    .from('sites')
    .update({ theme: { ...theme, template: template.key } })
    .eq('id', site.siteId)
  if (error) return { error: error.message }

  revalidatePath('/templates')
  revalidatePath('/settings')
  revalidatePath('/website')
  revalidatePath('/dashboard')
  return { ok: true }
}
