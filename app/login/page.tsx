'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { BRAND_NAME } from '@/lib/brand'

type Tab = 'link' | 'password'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('link')
  const [signup, setSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    setPending(true); setError(null); setNotice(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setPending(false)
    if (error) setError(error.message)
    else setNotice('Check your email for a sign-in link.')
  }

  async function withPassword(e: React.FormEvent) {
    e.preventDefault()
    setPending(true); setError(null); setNotice(null)
    if (signup) {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) { setError(error.message); setPending(false); return }
      if (data.session) { router.push('/dashboard'); router.refresh() }
      else { setNotice('Check your email to confirm, then sign in.'); setSignup(false); setPending(false) }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setPending(false); return }
      router.push('/dashboard'); router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="mx-auto flex w-full max-w-[1060px] items-center justify-between px-6 py-6">
        <Link href="/" className="font-display text-2xl">{BRAND_NAME}</Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="w-full max-w-sm">
          <p className="eyebrow mb-3 text-center">Welcome</p>
          <h1 className="text-center font-display text-4xl">Sign in to {BRAND_NAME}</h1>

          <div className="mt-8 flex rounded-md border border-line bg-paper-2 p-1 text-center">
            {(['link', 'password'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setNotice(null) }}
                className={`flex-1 rounded-[6px] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                  tab === t ? 'bg-surface text-ink shadow-card' : 'text-ink-3'
                }`}
              >
                {t === 'link' ? 'Email link' : 'Password'}
              </button>
            ))}
          </div>

          <form onSubmit={tab === 'link' ? sendLink : withPassword} className="mt-7 space-y-5">
            <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
            {tab === 'password' && (
              <Field
                label="Password" type="password" value={password} onChange={setPassword}
                autoComplete={signup ? 'new-password' : 'current-password'}
              />
            )}
            {error && <p className="text-sm text-bad">{error}</p>}
            {notice && <p className="text-sm text-accent-ink">{notice}</p>}
            <button
              type="submit" disabled={pending}
              className="w-full rounded-md bg-accent px-6 py-3 font-semibold text-white transition-transform hover:-translate-y-px disabled:opacity-50"
            >
              {pending ? 'Please wait…' : tab === 'link' ? 'Send sign-in link' : signup ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {tab === 'password' && (
            <p className="mt-6 text-center text-sm text-ink-3">
              {signup ? 'Already have an account? ' : 'New here? '}
              <button onClick={() => { setSignup(!signup); setError(null) }} className="text-accent-ink underline underline-offset-4">
                {signup ? 'Sign in' : 'Create one'}
              </button>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

function Field({ label, type, value, onChange, autoComplete }: {
  label: string; type: string; value: string; onChange: (v: string) => void; autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete} required
        className="w-full rounded-md border border-line bg-paper-2 px-3.5 py-3 text-ink outline-none focus:border-accent"
      />
    </label>
  )
}
