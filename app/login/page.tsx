'use client'

// Sign in (overhaul 3a/3b): split screen — the tool on the left, the
// artifact on the right (near-black panel holding an ivory invitation
// card: "The tool is software. What your guests get is a keepsake.").
// Same Supabase OTP/password flows as before.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { BRAND_NAME } from '@/lib/brand'
import { safeNextPath } from '@/lib/safe-redirect'

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
  const [linkSent, setLinkSent] = useState(false)
  // Where to land after signing in — set when something sent the user here to
  // authenticate first, e.g. a collaborator invitation. Validated with the
  // same helper the auth callback uses, so `?next=@evil.com` cannot turn the
  // login page into a redirector either.
  //
  // A lazy initialiser rather than an effect: `next` is never rendered, only
  // read inside the submit handlers, so there is nothing to hydrate-mismatch —
  // and setting state from an effect would cascade a second render for no
  // reason.
  const [next] = useState(() =>
    typeof window === 'undefined'
      ? '/dashboard'
      : safeNextPath(new URLSearchParams(window.location.search).get('next')),
  )

  // A failed sign-in link used to land here with `?error=auth` and NOTHING was
  // shown — a blank form, no explanation. The commonest cause is opening the
  // link on a different device from the one that asked for it, which cannot
  // work under PKCE (the verifier is stored on the requesting device). Someone
  // hitting that silently would request another link and loop forever.
  const [linkError] = useState(() => {
    if (typeof window === 'undefined') return null
    const e = new URLSearchParams(window.location.search).get('error')
    if (e === 'other-device') {
      return 'That link was opened on a different device from the one that asked for it, which we can’t verify. Request a fresh one below and open it on this device.'
    }
    if (e === 'auth') {
      return 'That sign-in link didn’t work — it may have expired, already been used, or been opened on a different device. Enter your email for a fresh one.'
    }
    return null
  })

  // Remember a template chosen on /preview/[template] so onboarding can
  // preselect it — a cookie survives the email-link round trip.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('template')
    if (t) document.cookie = `preferred-template=${encodeURIComponent(t)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
  }, [])

  async function sendLink(e?: React.FormEvent) {
    e?.preventDefault()
    setPending(true); setError(null); setNotice(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    })
    setPending(false)
    if (error) setError(error.message)
    else setLinkSent(true)
  }

  async function withPassword(e: React.FormEvent) {
    e.preventDefault()
    setPending(true); setError(null); setNotice(null)
    if (signup) {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      })
      if (error) { setError(error.message); setPending(false); return }
      if (data.session) { router.push(next); router.refresh() }
      else { setNotice('Check your email to confirm, then sign in.'); setSignup(false); setPending(false) }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setPending(false); return }
      router.push(next); router.refresh()
    }
  }

  async function forgotPassword() {
    if (!email) { setError('Enter your email first, then tap "Forgot password?" again.'); return }
    setPending(true); setError(null); setNotice(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    })
    setPending(false)
    if (error) setError(error.message)
    else setNotice('Check your email — we sent a link to set a new password.')
  }

  // 3b — link-sent state
  if (linkSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6 text-ink">
        <div className="w-[420px] max-w-full rounded-[14px] border border-line bg-surface p-7 text-center shadow-card">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Mail size={20} strokeWidth={1.7} />
          </span>
          <h1 className="mt-4 text-lg font-semibold tracking-tight">Check your email</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
            We sent a sign-in link to <span className="font-medium text-ink">{email}</span>.
            It works once and expires in about an hour.
          </p>
          <button type="button" onClick={() => sendLink()} disabled={pending}
            className="rounded-md mt-5 w-full border border-line px-4 py-2.5 text-[13px] font-medium text-ink hover:border-line-2 disabled:opacity-50">
            {pending ? 'Sending…' : 'Resend the link'}
          </button>
          <button type="button" onClick={() => setLinkSent(false)}
            className="rounded-md mt-3 text-[12.5px] text-ink-3 underline underline-offset-4 hover:text-ink">
            Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen bg-paper text-ink lg:grid-cols-2">
      {/* Left — the tool */}
      <div className="flex flex-col px-6 sm:px-12">
        <header className="flex items-center justify-between py-6">
          {/* The monogram needs ~30px of HEIGHT to hold together — measured:
              its hairlines break up below that, which is why the 32px favicon
              stays a letterform. Here there is room, so the real mark shows. */}
          <Link href="/" className="flex items-center gap-2.5" aria-label={BRAND_NAME}>
            <Image
              src="/brand/monogram-ink-320.png"
              alt=""
              width={53}
              height={32}
              priority
              className="h-8 w-auto dark:hidden"
            />
            <Image
              src="/brand/monogram-white-320.png"
              alt=""
              width={53}
              height={32}
              priority
              className="hidden h-8 w-auto dark:block"
            />
            <span className="text-[13px] font-semibold tracking-tight">{BRAND_NAME}</span>
          </Link>
          <ThemeToggle />
        </header>

        <main className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm pb-16">
            <h1 className="text-[28px] font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-[13.5px] text-ink-2">Sign in to your wedding command centre.</p>

            <div className="mt-7 flex rounded-lg border border-line bg-surface-2 p-1 text-center">
              {(['link', 'password'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(null); setNotice(null) }}
                  className={`flex-1 !rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                    tab === t ? 'bg-surface text-ink shadow-card' : 'text-ink-3'
                  }`}
                >
                  {t === 'link' ? 'Email link' : 'Password'}
                </button>
              ))}
            </div>

            {/* Shown above the form, not beside the submit button: this is
                about the link they just clicked, not about what they type. */}
            {linkError && (
              <p
                role="status"
                className="mt-6 rounded-md border border-warn/40 bg-warn-soft px-3.5 py-3 text-[13px] leading-relaxed text-ink"
              >
                {linkError}
              </p>
            )}

            <form onSubmit={tab === 'link' ? sendLink : withPassword} className="mt-6 space-y-4">
              <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
              {tab === 'password' && (
                <Field
                  label="Password" type="password" value={password} onChange={setPassword}
                  autoComplete={signup ? 'new-password' : 'current-password'}
                />
              )}
              {error && <p className="text-[13px] text-bad">{error}</p>}
              {notice && <p className="text-[13px] text-ok">{notice}</p>}
              <button
                type="submit" disabled={pending}
                className="rounded-md w-full bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50"
              >
                {pending ? 'Please wait…' : tab === 'link' ? 'Send sign-in link' : signup ? 'Create account' : 'Sign in'}
              </button>
              {tab === 'link' && <p className="text-center text-[12px] text-ink-3">No passwords needed — we email you a secure link.</p>}
            </form>

            {tab === 'password' && (
              <div className="mt-5 space-y-1.5 text-center text-[13px] text-ink-3">
                {/* No "Create one" here — the big create button below covers it. */}
                {signup && (
                  <p>
                    Already have an account?{' '}
                    <button onClick={() => { setSignup(false); setError(null) }} className="rounded-md text-accent-ink underline underline-offset-4">
                      Sign in
                    </button>
                  </p>
                )}
                {!signup && (
                  <p>
                    <button type="button" onClick={forgotPassword} disabled={pending}
                      className="rounded-md text-ink-3 underline underline-offset-4 hover:text-ink disabled:opacity-50">
                      Forgot password?
                    </button>
                  </p>
                )}
              </div>
            )}

            <div className="my-6 flex items-center gap-3 text-[11px] text-ink-3">
              <span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" />
            </div>
            <button type="button"
              onClick={() => { setTab('password'); setSignup(true); setError(null); setNotice(null) }}
              className="block w-full rounded-lg border border-line px-6 py-2.5 text-center text-[13.5px] font-medium text-ink hover:border-line-2">
              Create your wedding site free
            </button>
          </div>
        </main>
      </div>

      {/* Right — the artifact */}
      <div className="relative hidden items-center justify-center overflow-hidden lg:flex"
        style={{ background: 'linear-gradient(180deg, #0A1220 0%, #0C1526 60%, #0A1220 100%)' }}>
        <div aria-hidden className="absolute inset-0"
          style={{ background: 'radial-gradient(600px 420px at 65% 40%, oklch(0.62 0.21 29 / 0.16), transparent 70%)' }} />

        <div className="relative w-[340px] rotate-[-1.5deg] rounded-[4px] px-9 py-10 text-center shadow-lift"
          style={{ background: 'oklch(0.975 0.006 85)', color: '#211D18' }}>
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#97753F]">Together with their families</p>
          <p className="mt-3 font-display text-[34px] leading-tight">Aanya &amp; Dev</p>
          <div className="mx-auto mt-4 h-px w-14 bg-[#C4BAAA]" />
          <div className="mt-5 space-y-2.5 text-left text-[12px] text-[#5C544A]">
            {[
              { c: '#3E7C4F', n: 'Mehndi', d: 'Thu 17 Sep · At home' },
              { c: '#6D3FA9', n: 'Sangeet', d: 'Fri 18 Sep · The Grand Hall' },
              { c: '#C9A227', n: 'Ceremony', d: 'Sat 19 Sep · Merrydale Manor' },
              { c: '#7A1F1F', n: 'Reception', d: 'Sat 19 Sep · Merrydale Manor' },
            ].map((e) => (
              <p key={e.n} className="flex items-center gap-2.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.c }} />
                <span className="font-medium text-[#211D18]">{e.n}</span>
                <span className="ml-auto">{e.d}</span>
              </p>
            ))}
          </div>
          <span className="mt-7 inline-block bg-[#7A1F1F] px-6 py-2 text-[11px] font-semibold tracking-wide text-white">
            KINDLY RSVP
          </span>
        </div>

        <p className="absolute bottom-10 left-0 right-0 text-center text-[13px] text-white/55">
          The tool is software. What your guests get is <span className="font-display italic text-white/85">a keepsake</span>.
        </p>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange, autoComplete }: {
  label: string; type: string; value: string; onChange: (v: string) => void; autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-ink-2">{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete} required
        className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-selected"
      />
    </label>
  )
}
