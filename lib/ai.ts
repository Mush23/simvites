// Guarded Anthropic client. If ANTHROPIC_API_KEY is unset, aiConfigured()
// is false and callers fall back to their own heuristics — so the product
// works fully without it, and gets smarter the moment a key is added.

export function aiConfigured() {
  return !!process.env.ANTHROPIC_API_KEY
}

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001'

export interface AiMessage { role: 'user' | 'assistant'; content: string }

/**
 * General chat completion for the planning assistant. `system` carries the
 * couple's live wedding context; `messages` is the running conversation.
 * Returns null when AI isn't configured or the call fails.
 */
export async function chat(system: string, messages: AiMessage[], maxTokens = 1024): Promise<string | null> {
  if (!aiConfigured()) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY as string,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
      signal: AbortSignal.timeout(40_000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    const out = data.content?.filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim()
    return out || null
  } catch {
    return null
  }
}

export interface AiGuestRow { household: string; fullName: string; email?: string }

/**
 * Turn a messy, pasted guest list (from Excel, WhatsApp, a notes app —
 * any shape) into clean { household, fullName, email } rows. Groups people
 * into households sensibly (shared surname/address cues, "& family", etc.).
 * Returns null if AI isn't configured or the call fails, so the caller can
 * fall back to a simple parser.
 */
export async function parseGuestList(raw: string): Promise<AiGuestRow[] | null> {
  if (!aiConfigured()) return null
  const text = raw.slice(0, 12000) // keep the request bounded

  const system =
    'You convert messy wedding guest lists into structured data. ' +
    'Return ONLY a JSON array, no prose. Each element: {"household": string, "fullName": string, "email"?: string}. ' +
    'Group people who clearly belong together (same surname listed together, "and family", "& kids", a shared address or party) into the same household name. ' +
    'If a household name is not obvious, use the surname + " Family" (e.g. "The Shah Family"). ' +
    'Expand things like "Raj & Priya Shah" into two rows sharing a household. ' +
    'Skip header rows, totals and blank lines. Never invent emails.'

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY as string,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system,
        messages: [{ role: 'user', content: `Guest list to structure:\n\n${text}` }],
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    const out = data.content?.find((c) => c.type === 'text')?.text ?? ''
    const start = out.indexOf('[')
    const end = out.lastIndexOf(']')
    if (start === -1 || end === -1) return null
    const parsed = JSON.parse(out.slice(start, end + 1)) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed
      .map((r) => r as Record<string, unknown>)
      .filter((r) => typeof r.household === 'string' && typeof r.fullName === 'string')
      .map((r) => ({
        household: String(r.household).trim(),
        fullName: String(r.fullName).trim(),
        email: typeof r.email === 'string' && r.email.includes('@') ? r.email.trim() : undefined,
      }))
      .filter((r) => r.household && r.fullName)
      .slice(0, 500)
  } catch {
    return null
  }
}
