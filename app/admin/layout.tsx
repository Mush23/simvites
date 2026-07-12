import { ShieldCheck } from 'lucide-react'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { OverlayProvider } from '@/components/ui/overlays'
import { BRAND_NAME } from '@/lib/brand'

// Admin chrome (4c): the console wears its own ops voice — graphite +
// salmon via the scoped .admin-ops tokens, never confusable with the
// couple's ivory workspace at 1am. Also mounts the overlay primitives so
// askConfirm/notify work on every admin screen.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin()
  const now = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <OverlayProvider>
      <div className="admin-ops min-h-screen bg-paper text-ink">
        {admin && (
          <div className="flex items-center gap-3 border-b border-line bg-paper px-4 py-2.5">
            <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
              <ShieldCheck size={13} strokeWidth={2} />
              {BRAND_NAME}·Ops
            </span>
            <span className="rounded-pill border border-accent-line px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-accent">
              {process.env.NODE_ENV === 'production' ? 'production' : 'development'}
            </span>
            <span className="hidden text-[11px] text-ink-3 sm:inline">
              Actions here touch paying couples — everything confirms.
            </span>
            <span className="ml-auto font-mono text-[10px] text-ink-3">{admin.email} · {now}</span>
          </div>
        )}
        {children}
      </div>
    </OverlayProvider>
  )
}
