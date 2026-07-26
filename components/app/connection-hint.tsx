import Link from 'next/link'

// A quiet inline hint at the point of use, replacing the full-width amber
// banners that used to head Invitations and Messages.
//
// Individually each banner was fair. Together — Resend on Invitations, Twilio
// on Messages, plus the Assistant's own empty state — a third of the product
// announced itself as scaffolding, in alarm colours, on every visit. The
// status now lives in one place (Settings → Connections) and the point of use
// gets one calm line explaining what still works.

export function ConnectionHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-5 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[12.5px] text-ink-3">
      <span>{children}</span>
      <Link href="/settings#connections"
        className="font-medium text-ink-2 underline decoration-line-2 underline-offset-2 hover:text-ink">
        Set up sending
      </Link>
    </p>
  )
}
