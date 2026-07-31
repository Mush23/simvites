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
  archived guests and question validation. 13 of its 15 assertions pass. The
  other two do not: see 4a, which those tests found the first time anyone ran
  them. The suite is excellent; the code under it regressed.
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

### 4a. RSVP answer validation is silently disabled in the live database — NEW
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

Consequences, both live today:

- a guest can mark themselves **attending without answering a required
  question** — so a couple's meal-choice or dietary numbers can be incomplete,
  and they find out at the venue
- an answer **outside the option list is accepted and stored**, so a fixed-choice
  question can hold arbitrary values

*Verified: `npm run test:rsvp` fails exactly two assertions —
`attending without required answer → rejected [no error raised]` and
`answer outside the option list is rejected [no error raised]` — while all 13
other assertions, including the concurrent capacity race, pass.*

**Fix:** a new migration re-adding 0005's two blocks into 0018's function body.
The SQL already exists in 0005 and can be lifted verbatim. Not done here because
redefining a `security definer` RPC deserves review before it runs.

### 5. No privacy policy, terms, or cookie notice
No `/privacy` or `/terms` route exists, and nothing in the marketing footer links
to one. This is a paid UK product storing named guests, emails, phone numbers and
dietary requirements — i.e. personal and special-category data for people who
never signed up themselves. **This is a legal gate, not a polish item.**

### 6. No favicon or app icon — FIXED
No `favicon.ico`, `icon.tsx`, or `icon.png`. Every browser tab — including the
couple's published wedding site — shows the default globe.

### 7. Nothing behind auth has been visually verified
The entire design overhaul (11 commits) is typechecked, built and colour-measured
but **never opened**. Highest-risk screens, because they are dense and changed
most:
- **Guest list** — the invite matrix moved to a new status scale; labels went to
  12px inside a fixed-width grid (a 56px side column) where wrapping is plausible
- **Website editor** — dock panels now share the right rail with the section
  inspector; the "inspector steps aside" behaviour has never been observed
- **Settings → Connections**, the three merged tab bars, the seeded Templates gallery

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

Apply the migrations there first with `npm run db:apply`. Note the suites
currently FAIL two assertions against a migrated database — see 4a; fix that
before switching the secrets on, or the first run is red.

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
3. **Legal pages** (#5) — needs a decision and probably a template, so start early
4. **Click-through of guest list + editor** (#7) — the only way to find what
   review cannot
5. ~~Favicon (#6), guest error page (#10)~~ **done** — **robots decision (#12)** and the block-tombstone question (#10a) remain
6. ~~Fix lint, add it to CI (#8)~~ **done** — **wiring the two test suites into CI (#9)** remains
7. Everything in P2 as capacity allows
