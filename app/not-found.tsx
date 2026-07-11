import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6 text-center text-ink">
      <div className="max-w-md">
        <p className="eyebrow mb-3">{BRAND_NAME}</p>
        <h1 className="font-display text-4xl">This page isn&apos;t here.</h1>
        <p className="mt-4 leading-relaxed text-ink-2">
          The link may be old, or the site it points to hasn&apos;t been published yet.
        </p>
        <Link href="/"
          className="mt-8 inline-block rounded-md bg-accent px-7 py-3 font-semibold text-white transition-colors hover:bg-accent-ink">
          Go home
        </Link>
      </div>
    </div>
  )
}
