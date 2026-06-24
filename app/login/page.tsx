'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme/theme-toggle'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setNotice(null)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setPending(false)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setError(error.message)
        setPending(false)
        return
      }
      // If confirmations are off, a session is returned and we go straight in.
      if (data.session) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setNotice('Check your email to confirm your account, then sign in.')
        setMode('signin')
        setPending(false)
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="font-heading text-2xl tracking-wide-soft">
          Simvites
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <p className="mb-2 text-[0.7rem] uppercase tracking-luxury text-gold-ink">
              {mode === 'signin' ? 'Welcome back' : 'Get started'}
            </p>
            <h1 className="font-heading text-4xl font-light">
              {mode === 'signin' ? 'Sign in' : 'Create your account'}
            </h1>
          </div>

          <form onSubmit={onSubmit} className="mt-10 space-y-5">
            {mode === 'signup' && (
              <Field
                label="Name"
                type="text"
                value={name}
                onChange={setName}
                autoComplete="name"
              />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
            />

            {error && <p className="text-sm text-destructive">{error}</p>}
            {notice && <p className="text-sm text-gold-ink">{notice}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-full bg-primary px-6 py-3 text-[0.7rem] uppercase tracking-wide-soft text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                setError(null)
                setNotice(null)
              }}
              className="text-gold-ink underline underline-offset-4"
            >
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.7rem] uppercase tracking-wide-soft text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="w-full border-b border-border bg-transparent pb-2 text-foreground outline-none"
      />
    </label>
  )
}
