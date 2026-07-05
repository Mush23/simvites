'use server'

import { getPrimarySite } from '@/lib/workspace'
import { chat, aiConfigured, type AiMessage } from '@/lib/ai'
import { buildAssistantContext } from '@/lib/assistant-context'

export async function askAssistant(history: AiMessage[]): Promise<{ reply?: string; error?: string; notConfigured?: boolean }> {
  if (!aiConfigured()) return { notConfigured: true }
  const site = await getPrimarySite()
  if (!site) return { error: 'No site.' }
  if (!history.length) return { error: 'Ask a question.' }

  const context = await buildAssistantContext(site.siteId, site.title)
  const system =
    `You are the planning assistant inside a wedding platform, helping the couple running "${site.title}". ` +
    'Answer using ONLY the live data below — give real numbers, names and dates, not generic checklist advice. ' +
    'Be warm, concise and practical. When asked to draft a message (a guest reminder, a vendor follow-up), write it ready to send. ' +
    'If the data does not contain the answer, say so plainly and suggest where in the app to look.\n\n' +
    '=== LIVE WEDDING DATA ===\n' + context

  // Cap history so the request stays bounded.
  const trimmed = history.slice(-12)
  const reply = await chat(system, trimmed, 1200)
  if (!reply) return { error: 'The assistant is unavailable right now — please try again.' }
  return { reply }
}
