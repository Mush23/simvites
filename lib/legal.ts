// ═══════════════════════════════════════════════════════════════════════════
// Configuration for /privacy, /cookies and /terms.
//
// ⚠ THESE PAGES HAVE NOT BEEN REVIEWED BY A SOLICITOR.
//
// The *factual* content — what data is collected, which processors receive it,
// how long it is kept — was compiled by reading the code, and is accurate as of
// the date below. The *legal* content — lawful bases, the controller/processor
// split, whether dietary requirements are special-category data — is a
// good-faith draft by a non-lawyer and must be checked before launch. Two
// questions in particular are unresolved and are flagged inline on the page:
//
//   1. Controller vs processor for GUEST data. Guests never signed up to
//      Milestones; the couple uploaded them. The draft treats the couple as
//      controller and Milestones as processor, which is the common reading, but
//      Milestones decides retention and uses guest counts for its own billing —
//      facts that point at joint controllership. If it IS joint, a Art. 26
//      arrangement is required and the couple must be told the essence of it.
//
//   2. Dietary requirements. "Vegetarian" is a preference; "coeliac" or a nut
//      allergy is health data under Art. 9, and guests type free text into that
//      box. If Art. 9 applies, legitimate interests is NOT available as a basis
//      and explicit consent is likely needed at the point of asking.
//
// Neither is a wording problem, so neither can be fixed here.
// ═══════════════════════════════════════════════════════════════════════════

/** Flip to true ONLY after a solicitor has signed the pages off. Until then
 *  every legal page renders a visible draft notice. */
export const LEGAL_REVIEWED = false

/** Shown at the foot of each page. Bump when the substance changes — not for
 *  typos, and never automatically: "last updated" is a claim about review. */
export const LEGAL_UPDATED = '1 August 2026'

/** ⚠ A personal Hotmail address is not a suitable contact point for a data
 *  controller: it cannot be handed over, monitored by anyone else, or survive
 *  the founder losing the account, and a subject-access request landing in a
 *  personal inbox is itself a weakness. Replace with a role address on a
 *  domain the business controls (privacy@ / hello@ simvites.co.uk) before
 *  launch. Kept as-is for now so the page does not advertise a dead mailbox. */
export const LEGAL_CONTACT_EMAIL = 'maharshi.sim@hotmail.com'

/**
 * Details a UK privacy notice is required to state and that cannot be derived
 * from the codebase. Left null deliberately: each renders a visible
 * "to be completed" marker rather than a plausible-looking guess, so an
 * incomplete notice is obvious on the page instead of only in a diff.
 */
export const LEGAL_ENTITY = {
  /** Registered company name, or the trading name if a sole trader. */
  name: null as string | null,
  /** Companies House number, if incorporated. */
  companyNumber: null as string | null,
  /** Registered/trading address. Required — a controller must be contactable. */
  address: null as string | null,
  /** ICO registration number. Most UK businesses processing personal data
   *  electronically must register and pay the data-protection fee. */
  icoNumber: null as string | null,
} as const

export type LegalEntityField = keyof typeof LEGAL_ENTITY
