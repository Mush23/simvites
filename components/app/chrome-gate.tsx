'use client'

import { usePathname } from 'next/navigation'

/** 1c: on /website the artifact IS the interface — the app sidebar and
 * header step aside; the editor brings its own floating chips + dock. */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/website' || pathname.startsWith('/website/')) return null
  return <>{children}</>
}
