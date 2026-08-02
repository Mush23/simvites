import { createClient } from '@/lib/supabase/server'
import { getPrimarySite } from '@/lib/workspace'
import { revokeCollaboratorInvitation, removeCollaborator } from './actions'
import { INVITE_EXPIRY_DAYS } from '@/lib/collaborators'

interface MemberRow {
  user_id: string
  role: string
  profiles: { email: string | null } | { email: string | null }[] | null
}
interface InviteRow {
  id: string
  email: string
  created_at: string
  expires_at: string
}

const emailOf = (p: MemberRow['profiles']) =>
  (Array.isArray(p) ? p[0]?.email : p?.email) ?? 'unknown'

/**
 * Who can reach this wedding, and who has been asked.
 *
 * M1: before the invitation flow existed, this section was a single "add"
 * box with no list — so there was no way to see who had access, and no way to
 * take it away. Both of those matter more than the add button.
 */
export async function Collaborators() {
  const site = await getPrimarySite()
  if (!site) return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from('memberships')
      .select('user_id, role, profiles(email)')
      .eq('org_id', site.orgId),
    supabase
      .from('collaborator_invitations')
      .select('id, email, created_at, expires_at')
      .eq('org_id', site.orgId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .order('created_at', { ascending: false }),
  ])

  const rows = (members ?? []) as MemberRow[]
  const pending = ((invites ?? []) as InviteRow[]).filter((i) => new Date(i.expires_at) > new Date())
  const isOwner = site.role === 'owner'

  return (
    <section className="rounded-card border border-line bg-surface p-7 shadow-card">
      <p className="eyebrow mb-2">Collaborators</p>
      <p className="mb-5 text-sm text-ink-2">
        Weddings are planned together. Invite your partner, a parent or your planner —
        they get full access to plan. They&rsquo;ll be asked to accept first, so nothing
        appears in anyone&rsquo;s account without their say-so.
      </p>

      <ul className="mb-5 divide-y divide-line rounded-md border border-line">
        {rows.map((m) => (
          <li key={m.user_id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0 truncate text-[13.5px] text-ink">
              {emailOf(m.profiles)}
              {m.user_id === user?.id && <span className="text-ink-3"> (you)</span>}
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="microlabel text-ink-3">{m.role}</span>
              {isOwner && m.role !== 'owner' && m.user_id !== user?.id && (
                <form action={async () => { 'use server'; await removeCollaborator(m.user_id) }}>
                  <button type="submit" className="text-[12.5px] text-bad underline underline-offset-2 hover:opacity-80">
                    Remove
                  </button>
                </form>
              )}
            </span>
          </li>
        ))}
      </ul>

      {pending.length > 0 && (
        <div className="mb-5">
          <p className="microlabel mb-2 text-ink-3">Awaiting acceptance</p>
          <ul className="divide-y divide-line rounded-md border border-dashed border-line">
            {pending.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 truncate text-[13.5px] text-ink-2">{i.email}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="microlabel text-ink-3">
                    expires {new Date(i.expires_at).toLocaleDateString('en-GB')}
                  </span>
                  {isOwner && (
                    <form action={async () => { 'use server'; await revokeCollaboratorInvitation(i.id) }}>
                      <button type="submit" className="text-[12.5px] text-ink-3 underline underline-offset-2 hover:text-ink">
                        Withdraw
                      </button>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOwner ? (
        <form
          action={async (fd) => { 'use server'; await (await import('./actions')).inviteCollaborator(fd) }}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="block">
            <span className="eyebrow mb-1.5 block">Their email</span>
            <input
              name="email" type="email" required placeholder="partner@example.com"
              className="w-64 rounded-md border border-line bg-paper-2 px-3.5 py-3 text-ink outline-none focus:border-selected"
            />
          </label>
          <button
            type="submit"
            title={`They get an email with a link. It expires in ${INVITE_EXPIRY_DAYS} days and grants nothing until they accept.`}
            className="rounded-md border border-accent-line px-5 py-3 font-semibold text-accent-ink transition-colors hover:bg-accent-soft"
          >
            Send invitation
          </button>
        </form>
      ) : (
        <p className="text-[13px] text-ink-3">
          Only the owner of this wedding can invite or remove collaborators.
        </p>
      )}
    </section>
  )
}
