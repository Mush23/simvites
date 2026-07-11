import { ShieldCheck } from 'lucide-react'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { OverlayProvider } from '@/components/ui/overlays'

// Admin chrome (4a): a graphite identity band says "you are in admin" —
// the couple workspace stays ivory. Also mounts the overlay primitives so
// askConfirm/notify work on every admin screen.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin()

  return (
    <OverlayProvider>
      {admin && (
        <div className="flex items-center gap-2.5 bg-graphite px-4 py-1.5">
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-graphite-accent">
            <ShieldCheck size={12} strokeWidth={2} />
            Platform admin
          </span>
          <span className="hidden text-[11px] text-white/45 sm:inline">
            Actions here touch paying couples — everything confirms.
          </span>
          <span className="ml-auto font-mono text-[10px] text-white/55">{admin.email}</span>
        </div>
      )}
      {children}
    </OverlayProvider>
  )
}
