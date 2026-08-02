// Working brand name — not legally cleared. A rename is a one-line change here
// (handoff §13). Everything user-facing reads from BRAND_NAME.
//
// Renamed from "Simvites" on 2026-08-02. The one-line promise held for the
// product surfaces; what it did NOT cover was a scatter of hardcoded literals
// (an outbound User-Agent, a mail From, admin placeholders, two landing-page
// mockups) which have since been pointed at this constant so the next rename
// really is one line.
export const BRAND_NAME = 'Milestones'

// ⚠ STILL THE OLD DOMAIN. Deliberately not renamed: a domain is something you
// own or do not, and inventing `milestones.co.uk` in a legal notice and on the
// pricing page would be a claim rather than a fallback. Set
// NEXT_PUBLIC_BASE_DOMAIN once the real one is registered, and change this
// default to match.
//
// The fallback is user-visible: Settings shows "<slug>.<BASE_DOMAIN>" as the
// couple's address, so an unset env var used to advertise the pre-rename domain.
export const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'simvites.co.uk'
