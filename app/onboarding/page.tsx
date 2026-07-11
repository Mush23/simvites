import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { requireUser } from '@/lib/auth'
import { getPrimarySite } from '@/lib/workspace'
import { BRAND_NAME } from '@/lib/brand'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { listTemplates } from '@/lib/templates/registry'
import { OnboardingForm } from './onboarding-form'

export const metadata = { title: `Create your site · ${BRAND_NAME}` }

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  await requireUser()
  if (await getPrimarySite()) redirect('/dashboard')

  // Preselect the look chosen on /preview/[template]: ?template= wins,
  // else the cookie set on /login. Unknown keys fall back to the default.
  const [{ template: fromQuery }, cookieStore] = await Promise.all([searchParams, cookies()])
  const templates = listTemplates()
  const wanted = fromQuery ?? cookieStore.get('preferred-template')?.value
  const preselect = templates.some((t) => t.key === wanted) ? wanted : undefined

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="mx-auto flex w-full max-w-[1060px] items-center justify-between px-6 py-6">
        <span className="text-[13px] font-semibold tracking-tight">{BRAND_NAME}</span>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pb-24 pt-6">
        <div className="w-full max-w-xl">
          <h1 className="text-center text-[26px] font-semibold tracking-tight">Create your wedding site</h1>
          <p className="mx-auto mt-2 max-w-sm text-center text-[13.5px] text-ink-2">
            Three quick moves. One site holds everything — events, guests, RSVPs and planning.
          </p>
          <div className="mt-8 rounded-[14px] border border-line bg-surface p-6 shadow-card sm:p-8">
            <OnboardingForm templates={templates} preselect={preselect} />
          </div>
        </div>
      </main>
    </div>
  )
}
