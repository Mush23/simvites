'use client'

import { useRef, useState } from 'react'
import { Sparkles, Send, Copy, Check } from 'lucide-react'
import { askAssistant } from './actions'
import type { AiMessage } from '@/lib/ai'

const SUGGESTIONS = [
  'How many people have not replied yet?',
  'What are my meal totals for the caterer?',
  'Which payments are due next, and when?',
  'Draft a warm reminder for guests who haven’t RSVP’d.',
]

export function AssistantChat({ configured }: { configured: boolean }) {
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function send(text: string) {
    const q = text.trim()
    if (!q || busy) return
    setError(null)
    const next: AiMessage[] = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setInput('')
    setBusy(true)
    const res = await askAssistant(next)
    setBusy(false)
    if (res.notConfigured) { setError('not-configured'); return }
    if (res.error) { setError(res.error); return }
    setMessages([...next, { role: 'assistant', content: res.reply ?? '' }])
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50)
  }

  if (!configured) {
    return (
      <div className="rounded-card border border-line bg-surface p-8 text-center shadow-card">
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Sparkles size={20} strokeWidth={1.7} />
        </span>
        <p className="text-[15px] font-semibold text-ink">The assistant isn’t connected yet</p>
        <p className="mx-auto mt-1.5 max-w-md text-[13.5px] text-ink-2">
          The assistant isn&rsquo;t switched on yet — it&rsquo;s coming with early access.
          Once it arrives, it answers from your live wedding data and drafts messages for you.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-line bg-surface shadow-card">
      <div ref={scrollRef} className="max-h-[52vh] min-h-[220px] space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="py-6 text-center">
            <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Sparkles size={18} strokeWidth={1.7} />
            </span>
            <p className="text-[13.5px] text-ink-2">Ask me anything about your wedding, or try one of these:</p>
            <div className="mx-auto mt-4 flex max-w-lg flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)}
                  className="rounded-full border border-line px-3 py-1.5 text-left text-[12.5px] text-ink-2 hover:border-accent hover:text-ink">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`group relative max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
              m.role === 'user' ? 'bg-accent text-white' : 'border border-line bg-paper text-ink'}`}>
              {m.content}
              {m.role === 'assistant' && (
                <button type="button" onClick={() => { navigator.clipboard.writeText(m.content); setCopied(i); setTimeout(() => setCopied(null), 1500) }}
                  className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-md border border-line bg-surface text-ink-3 group-hover:flex hover:text-ink"
                  aria-label="Copy">
                  {copied === i ? <Check size={12} /> : <Copy size={12} />}
                </button>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="flex justify-start"><div className="rounded-2xl border border-line bg-paper px-3.5 py-2.5 text-[13px] text-ink-3">Thinking…</div></div>}
        {error && error !== 'not-configured' && <p className="text-center text-[13px] text-bad">{error}</p>}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input) }}
        className="flex items-center gap-2 border-t border-line p-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about guests, budget, RSVPs, payments…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus:border-accent" />
        <button type="submit" disabled={busy || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white disabled:opacity-40" aria-label="Send">
          <Send size={16} strokeWidth={1.8} />
        </button>
      </form>
    </div>
  )
}
