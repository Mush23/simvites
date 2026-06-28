import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getPrimarySite } from '@/lib/workspace'
import { BRAND_NAME } from '@/lib/brand'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { OnboardingForm } from './onboarding-form'

export const metadata = { title: `Create your site · ${BRAND_NAME}` }

export default async function OnboardingPage() {
  await requireUser()
  if (await getPrimarySite()) redirect('/dashboard')

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="mx-auto flex w-full max-w-[1060px] items-center justify-between px-6 py-6">
        <span className="font-display text-2xl">{BRAND_NAME}</span>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="w-full max-w-md">
          <p className="eyebrow mb-3 text-center">Let&apos;s begin</p>
          <h1 className="text-center font-display text-4xl">Create your wedding site</h1>
          <p className="mx-auto mt-4 max-w-sm text-center text-ink-2">
            One site holds everything — events, guests, RSVPs and planning. You can rename anything later.
          </p>
          <div className="mt-9 rounded-card border border-line bg-surface p-7 shadow-card">
            <OnboardingForm />
          </div>
        </div>
      </main>
    </div>
  )
}
