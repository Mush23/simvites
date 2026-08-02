/**
 * Shared constants for the collaborator invitation flow (M1).
 *
 * Lives here rather than in settings/actions.ts because a `'use server'` file
 * may only export async functions — a plain `export const` there is a build
 * error, and typecheck does not catch it.
 */

/** How long an invitation stays valid. Mirrored in the 0021 column default. */
export const INVITE_EXPIRY_DAYS = 14

