# Deploying Milestones to Vercel

Two ways to deploy. **Dashboard** is easiest for a one-time setup; **CLI** lets
me drive it if you give me a token.

> **The domain is not chosen yet.** `simvites.co.uk` was never registered — it is
> still available, and the product has since been renamed. This file uses
> `<your-domain>` throughout; substitute it once the domain is bought. See
> `docs/LAUNCH-READINESS.md` for the wider pre-launch gap list.

---

## Environment variables (set these in Vercel → Project → Settings → Env Vars)

Set every one of these for **both** the Production and Preview scopes.

### Required — the app will not work without them

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rpkcrazictrjuxheugod.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your `sb_publishable_…` key |
| `SUPABASE_SERVICE_ROLE_KEY` | your `sb_secret_…` key — server only, bypasses RLS |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `<your-domain>` (once the domain is attached) |
| `NEXT_PUBLIC_BASE_DOMAIN` | `<your-domain>` — the address shown to couples in Settings |
| `TOKEN_PEPPER` | **see the warning below** |
| `GUEST_SESSION_SECRET` | **see the warning below** |
| `CRON_SECRET` | a long random string. Without it `/api/cron/*` returns 503 rather than running unauthenticated |
| `PLATFORM_ADMIN_EMAILS` | comma-separated allowlist for `/admin` |

### Optional — each is guarded and degrades cleanly

| Variable | Behaviour if unset |
|---|---|
| `RESEND_API_KEY` | Guest invitation emails report `skipped` instead of sending |
| `RESEND_FROM` | Falls back to `onboarding@resend.dev` |
| `STRIPE_SECRET_KEY` | Checkout shows "payments are not connected yet" |
| `STRIPE_WEBHOOK_SECRET` | **Required in production if Stripe is connected** — the webhook returns 503 rather than trusting unsigned payloads |
| `ANTHROPIC_API_KEY` | Guest import falls back to the column parser; Assistant shows a connect state |
| `UNSPLASH_ACCESS_KEY` | Photo search falls back to Openverse |
| `NEXT_PUBLIC_POSTHOG_KEY` / `_HOST` | No analytics — the launch funnel is blind |
| `TWILIO_*` | Message threads work; sending and receiving stay off |

> ### ⚠ `TOKEN_PEPPER` and `GUEST_SESSION_SECRET` can never change once live
>
> Guest invite tokens are stored as `sha256(TOKEN_PEPPER + raw)` and the raw
> token is **never** kept — see `lib/tokens.ts`. Change the pepper and every
> invitation link ever sent stops working, permanently and unrecoverably.
> `GUEST_SESSION_SECRET` signs the guest cookie and behaves the same way.
>
> Copy the exact values out of the working `.env.local` rather than generating
> fresh ones for Vercel, and keep a copy somewhere safe. Both modules **throw**
> rather than fall back if the variable is missing, which is deliberate — an
> unpeppered hash is a security bug, not a degraded mode.

`DATABASE_URL` is **not** needed on Vercel — it is only used by the local
`db:apply` / `db:verify` migration scripts.

---

## Option A — Vercel dashboard (recommended, one-time)

1. Go to vercel.com → **Add New… → Project** → import **Mush23/simvites**
   (authorise GitHub if asked). Vercel auto-detects Next.js — no settings to change.
2. Before the first deploy, add the env vars above.
3. Deploy. You get a `*.vercel.app` URL (marketing + dashboard + login work here).
4. Every `git push` to `main` now auto-deploys.

## Option B — CLI (I can drive this with a token)

1. You create a token at **vercel.com → Account Settings → Tokens**.
2. Paste it to me. I run (token kept out of the repo):
   ```bash
   vercel link --yes --token <TOKEN>
   vercel env add ...        # I script the env vars
   vercel --prod --token <TOKEN>
   ```

---

## Wildcard domain `*.<your-domain>` (enables real tenant subdomains)

Needed so `couplename.<your-domain>` works in production. **Vercel Pro is
required** both for wildcard domains and for commercial use at all — the Hobby
plan is explicitly non-commercial, so the day you take a payment on Hobby you
are in breach of their terms.

1. Vercel → Project → **Settings → Domains** → add `<your-domain>` **and**
   `*.<your-domain>`.
2. At your domain registrar, add the DNS records Vercel shows:
   - `<your-domain>` → A/ALIAS to Vercel
   - `*.<your-domain>` → CNAME to `cname.vercel-dns.com`
3. Set `NEXT_PUBLIC_ROOT_DOMAIN` and `NEXT_PUBLIC_BASE_DOMAIN` to
   `<your-domain>` and redeploy.
4. `proxy.ts` then resolves any `<slug>.<your-domain>` → the tenant site.

> Until the domain is attached, the app is fully usable at `*.vercel.app` for the
> marketing site, dashboard and editor; only public tenant subdomains need the
> wildcard.

---

## After deploy — Supabase auth email (do not skip)

**This one blocks launch.** Supabase's built-in email sender is capped at
**2 messages per hour** and their own documentation calls it best-effort and
unsuitable for production. Login is a magic link, so without custom SMTP the
third person trying to sign in within an hour simply cannot.

1. **Supabase → Authentication → Emails → SMTP Settings** → enable custom SMTP:

   | Field | Value |
   |---|---|
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | your `re_…` Resend API key |
   | Sender | `noreply@<your-domain>` |

2. **Authentication → Rate Limits** → raise the email limit. Custom SMTP starts
   at 30/hour, which is fine day to day and tight on a launch day.
3. **Authentication → URL Configuration** → set **Site URL** to
   `https://<your-domain>`, and add these **Redirect URLs** — magic links
   silently fail to redirect without them:
   ```
   https://<your-domain>/auth/callback
   https://*.<your-domain>/auth/callback
   https://*.vercel.app/auth/callback
   http://localhost:3100/auth/callback
   http://lvh.me:3100/auth/callback
   ```

Resend's own DNS records (DKIM/SPF) must be verified before any of this works —
see `docs/CONNECT.md`.

---

## After deploy — register the Stripe webhook

Stripe → **Developers → Webhooks → Add endpoint**:

```
https://<your-domain>/api/stripe/webhook
```

Subscribe to exactly one event: **`checkout.session.completed`**. Copy the
signing secret into `STRIPE_WEBHOOK_SECRET`.

> The path is `/api/stripe/webhook`, **not** `/api/webhooks/stripe`. This file
> claimed the latter until 2026-08-05; it does not exist, and a webhook pointed
> there would have failed silently while checkout appeared to work.

**No Stripe Products or Prices need creating.** Checkout builds the line item
inline from `lib/pricing.ts`, and the amount is editable from `/admin` without a
deploy (`platform_settings.unlock_price`, falling back to `UNLOCK_AMOUNT`).

There is **no Resend webhook** — this file used to tell you to register
`/api/webhooks/resend`, which has never existed. The only inbound webhooks the
app serves are `/api/stripe/webhook` and `/api/webhooks/twilio`.
