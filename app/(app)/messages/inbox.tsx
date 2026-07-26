'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Send, Phone } from 'lucide-react'
import { sendToHousehold } from './actions'
import { notify } from '@/components/ui/overlays'

export interface ThreadMessage {
  id: string; direction: 'in' | 'out'; channel: string; body: string; status: string | null; createdAt: string
}
export interface Thread {
  householdId: string; name: string; hasPhone: boolean
  messages: ThreadMessage[]; lastAt: string | null; unreadIn: number
}

const time = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function Inbox({ threads, unlocked, sms, whatsapp }: {
  threads: Thread[]; unlocked: boolean; sms: boolean; whatsapp: boolean
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const refresh = () => startTransition(() => router.refresh())
  const [activeId, setActiveId] = useState<string | null>(threads[0]?.householdId ?? null)
  const [channel, setChannel] = useState<'sms' | 'whatsapp'>(whatsapp && !sms ? 'whatsapp' : 'sms')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const active = threads.find((t) => t.householdId === activeId) ?? null
  const configured = sms || whatsapp

  async function send() {
    if (!active || !text.trim() || busy) return
    setBusy(true)
    const res = await sendToHousehold(active.householdId, channel, text)
    setBusy(false)
    if (res.error) { notify(res.error, { tone: 'warn' }); return }
    setText('')
    notify(res.skipped ? 'Saved to thread (connect Twilio to deliver)' : 'Message sent')
    refresh()
  }

  if (threads.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line bg-paper-2 p-10 text-center text-ink-2">
        <Phone size={22} strokeWidth={1.5} className="mx-auto mb-3 text-ink-3" />
        Add phone numbers to your guests and their households will appear here as message threads.
      </div>
    )
  }

  return (
    <div>
      {!configured && (
        <div className="mb-4 rounded-lg border border-warn/40 bg-warn-soft px-4 py-2.5 text-[13px] text-ink">
          Messaging isn’t connected yet — add your Twilio keys to send and receive. You can still write and save threads here.
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        {/* Thread list */}
        <div className="max-h-[64vh] space-y-1 overflow-y-auto rounded-card border border-line bg-surface p-2 shadow-card">
          {threads.map((t) => (
            <button key={t.householdId} type="button" onClick={() => setActiveId(t.householdId)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
                activeId === t.householdId ? 'bg-surface-2' : 'hover:bg-surface-2'}`}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-ink">
                {t.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-ink">{t.name}</span>
                <span className="block truncate text-[11.5px] text-ink-3">
                  {t.messages.length ? t.messages[t.messages.length - 1].body : t.hasPhone ? 'No messages yet' : 'No phone number'}
                </span>
              </span>
              {t.lastAt && <span className="shrink-0 font-mono text-[9.5px] text-ink-3">{new Date(t.lastAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
            </button>
          ))}
        </div>

        {/* Conversation */}
        <div className="flex min-h-[420px] flex-col rounded-card border border-line bg-surface shadow-card">
          {active ? (
            <>
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="text-[14px] font-semibold text-ink">{active.name}</p>
                {(sms && whatsapp) && (
                  <div className="flex rounded-lg border border-line bg-surface-2 p-0.5 text-[11.5px]">
                    {(['sms', 'whatsapp'] as const).map((c) => (
                      <button key={c} type="button" onClick={() => setChannel(c)}
                        className={`rounded-md px-2.5 py-1 font-medium capitalize ${channel === c ? 'bg-surface text-ink shadow-card' : 'text-ink-3'}`}>
                        {c === 'sms' ? 'SMS' : 'WhatsApp'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {active.messages.length === 0 && (
                  <p className="py-8 text-center text-[13px] text-ink-3">No messages yet — say hello below.</p>
                )}
                {active.messages.map((m) => (
                  <div key={m.id} className={m.direction === 'out' ? 'flex justify-end' : 'flex justify-start'}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed ${
                      m.direction === 'out' ? 'bg-accent text-white' : 'border border-line bg-paper text-ink'}`}>
                      {m.body}
                      <span className={`mt-1 block text-[9.5px] ${m.direction === 'out' ? 'text-white/70' : 'text-ink-3'}`}>
                        {time(m.createdAt)}{m.direction === 'out' && m.status ? ` · ${m.status}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex items-center gap-2 border-t border-line p-3">
                <input value={text} onChange={(e) => setText(e.target.value)}
                  placeholder={active.hasPhone ? `Message ${active.name}…` : 'This household has no phone number'}
                  disabled={!active.hasPhone || !unlocked}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus:border-selected disabled:opacity-50" />
                <button type="submit" disabled={busy || !text.trim() || !active.hasPhone || !unlocked}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white disabled:opacity-40" aria-label="Send">
                  <Send size={16} strokeWidth={1.8} />
                </button>
              </form>
              {!unlocked && <p className="px-4 pb-3 text-[12px] text-ink-3">Sending is part of the unlock — see Settings.</p>}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-[13px] text-ink-3">
              <MessageSquare size={18} className="mr-2" /> Select a household to start.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
