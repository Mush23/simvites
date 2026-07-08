import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BRAND_NAME } from '@/lib/brand'
import { PasswordForm } from '@/components/auth/password-form'

export const metadata = { title: `Set a new password · ${BRAND_NAME}` }

// Landing point of the "Forgot password?" email: the callback has already
// exchanged the recovery code for a session, so the user just sets a new
// password here. No session → back to login.
export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?error=auth')

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6 text-ink">
      <div className="w-[420px] max-w-full rounded-[14px] border border-line bg-surface p-7 shadow-card">
        <h1 className="text-lg font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-1.5 text-[13.5px] text-ink-2">
          For <span className="font-medium text-ink">{user.email}</span>. You’ll stay signed in.
        </p>
        <div className="mt-5">
          <PasswordForm redirectTo="/dashboard" />
        </div>
      </div>
    </div>
  )
}
