'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { hashToken } from '@/lib/tokens'

const FRIENDLY: [RegExp, string][] = [
  [/not signed in/, 'Please sign in first.'],
  [/invitation not found/, 'That invitation link is not valid.'],
  [/invitation revoked/, 'That invitation has been withdrawn.'],
  [/already accepted/, 'That invitation has already been accepted.'],
  [/invitation expired/, 'That invitation has expired — ask them to send a new one.'],
  [/wrong account/, 'You are signed in with a different email address than the one that was invited.'],
]

/**
 * Accept a collaborator invitation.
 *
 * Everything that matters is enforced inside `accept_collaborator_invitation`
 * (0021): it locks the row, re-checks revoked/accepted/expired, and requires
 * the signed-in email to match the invited address — so holding the link is
 * not by itself enough. This wrapper exists to pass the caller's session (the
 * RPC reads auth.uid() and auth.jwt()) and to translate the exceptions.
 */
export async function acceptInvitation(rawToken: string): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in first.' }

  // Send the HASH, never the raw token — it should not reach query logs.
  const { error } = await supabase.rpc('accept_collaborator_invitation', {
    p_token_hash: hashToken(rawToken),
  })
  if (error) {
    const friendly = FRIENDLY.find(([re]) => re.test(error.message))?.[1]
    return { error: friendly ?? 'Could not accept that invitation.' }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}
