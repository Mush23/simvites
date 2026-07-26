// Working brand name — not legally cleared. A rename is a one-line change here
// (handoff §13). Everything user-facing reads from BRAND_NAME.
export const BRAND_NAME = 'Simvites'
// The fallback is user-visible: Settings shows "<slug>.<BASE_DOMAIN>" as the
// couple's address, so an unset env var used to advertise the pre-rename domain.
export const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'simvites.co.uk'
