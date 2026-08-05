# Connecting Milestones to its services

A plain-English checklist of every external service, what it's for, where to get
the credential, and where it goes. Secrets live in **`.env.local`** (gitignored —
never committed). You hand me each value once; I wire it in and run everything.

Status legend: ✅ connected · ⏳ needed now · 🔜 later phase

---

## ✅ GitHub — source control
- **Repo:** https://github.com/Mush23/simvites (private — still the pre-rename
  name; renaming the repo would break the Vercel link, so it stays for now)
- **Auth:** `gh` CLI, logged in as `Mush23`. Nothing more to do.

## ✅ Supabase — database, storage, auth (project `rpkcrazictrjuxheugod`)
Already in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — `https://rpkcrazictrjuxheugod.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your **publishable** key (browser, safe)
- `SUPABASE_SERVICE_ROLE_KEY` — your **secret** key (server only)

### ✅ DATABASE_URL — done, migrations applied through 0025
The API keys above can read/write data but can't *create tables*. For that I need
the Postgres connection string (it contains the database password). This is set,
and kept here because you will need it again if the password is ever rotated.

**How to get it (≈30 seconds):**
1. In your Supabase dashboard, click the green **Connect** button at the top.
2. Open the **Connection string** section → **URI** tab.
3. Choose **Session pooler** (works on home/office networks; the "Direct" option
   is often IPv6-only).
4. Copy the string. It looks like:
   `postgresql://postgres.rpkcrazictrjuxheugod:[YOUR-PASSWORD]@aws-0-REGION.pooler.supabase.com:5432/postgres`
5. Replace `[YOUR-PASSWORD]` with your database password.
   - Don't have it? **Project Settings → Database → Database password → Reset
     database password**, set one, copy it, then put it into the string.
6. **Paste the finished string to me.** I'll save it as `DATABASE_URL` in
   `.env.local` and run `npm run db:apply` (creates all tables + RLS + seeds
   Template #1) then `npm run db:verify`.

> Security: this string is project-scoped (not your whole account), stays only in
> the gitignored `.env.local`, and you can rotate the password anytime from the
> same settings page.

## ⏳ Resend — invite emails **and** login emails
One signup, two jobs. The second one blocks launch.

- Sign up at resend.com → **Domains → Add Domain** → add the DNS records Resend
  shows (DKIM/SPF) at your registrar and wait for verification.
- **API Keys** → create one with *Sending access* (`re_…`). Shown once.
- Give me the key → goes to `RESEND_API_KEY` + `RESEND_FROM`, which is what
  makes **guest invitations** send.
- **Then paste the same key into Supabase as custom SMTP** — see below. That is
  a separate path and covers **login**.
- Free tier: 3,000 emails/month, 100/day, one sending domain.

## ⏳ Supabase custom SMTP — the actual launch blocker
Supabase's built-in email sender is capped at **2 messages per hour** and their
own docs call it best-effort and unsuitable for production. Login is a magic
link, so without this the third person signing in within an hour cannot get in.

- **Authentication → Emails → SMTP Settings**: host `smtp.resend.com`, port
  `465`, username `resend`, password = your `re_…` key, sender
  `noreply@<your-domain>`.
- **Authentication → Rate Limits**: raise the email limit off the 30/hour
  default that custom SMTP starts at.
- **Authentication → URL Configuration**: Site URL + the redirect URL list in
  `docs/DEPLOY.md`. Magic links silently fail to redirect without them.
- No extra cost, no extra account.

## 🔜 Stripe — payments
- Stripe dashboard (test mode) → **Developers → API keys** → the **secret** key
  (`sk_test_…`). Ignore the publishable key: nothing in this codebase reads it,
  because checkout is a server-side redirect rather than Stripe.js.
- **Developers → Webhooks** → add `https://<your-domain>/api/stripe/webhook`
  subscribed to `checkout.session.completed`, which gives a signing secret
  (`whsec_…`).
- Give me both → `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- **No Products or Prices to create** — the line item is built inline from
  `lib/pricing.ts` and the amount is editable from `/admin`.
- No monthly fee; 1.5% + 20p on standard UK cards.

## 🔜 Vercel — hosting + wildcard/custom domains (at deploy)
- Connect the GitHub repo at vercel.com. Hobby is **non-commercial only**, so
  Pro ($20/mo) is required both for commercial use and for wildcard domains.
- For `*.<your-domain>`: add the domain in Vercel and set the DNS wildcard
  record at your registrar.
- The per-couple custom-domain add-on would use the Vercel Domains API
  (`VERCEL_API_TOKEN`) — **not built yet**, so that variable is currently read
  by no code.

## 🔜 Anthropic — AI import + planning assistant
Powers the **"Tidy & preview"** guest import and the **Assistant** module.
Both are *guarded*: the app works fully without a key and switches on the
moment it's added.
- Get a key at console.anthropic.com → **API Keys** (`sk-ant-…`).
- Give me the key → goes to `ANTHROPIC_API_KEY`.
- Optional `ANTHROPIC_MODEL` (defaults to `claude-haiku-4-5-20251001` — cheap
  and fast; bump to a larger model for the assistant if you want).

## 🔜 Twilio — two-way SMS + WhatsApp guest messaging
Powers the **Messages** inbox. Guarded: threads work without it; sending +
receiving switch on once configured.
- Twilio console → **Account SID** and **Auth Token**.
- Buy an SMS-capable number (E.164, e.g. `+447…`) → `TWILIO_SMS_FROM`.
- For WhatsApp: enable the WhatsApp sender (or the sandbox to trial) → put the
  number in `TWILIO_WHATSAPP_FROM` (without the `whatsapp:` prefix).
- Set the number's **inbound webhook** (Messaging → your number → "A message
  comes in") to: `https://<your-domain>/api/webhooks/twilio` (POST).
- Give me: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`,
  and/or `TWILIO_WHATSAPP_FROM`.

## ⏳ CRON_SECRET — protects the daily payment-reminder job
The reminder cron (`/api/cron/payment-reminders`, runs 08:00 daily on Vercel)
is locked to requests carrying this secret. I've generated a strong value —
add it as `CRON_SECRET` on Vercel (Vercel Cron sends it automatically). It has
no external signup.

---

### Verifying the database at any time
```bash
npm run db:apply    # all migrations + Template #1 seed (idempotent)
npm run db:verify   # confirms tables, RLS, seeded template
```
Applied through `0025` against production. CI re-runs every migration from
scratch on a throwaway Supabase per push, so a migration that no longer applies
cleanly fails there rather than on a fresh deploy.

### Still outstanding, and only you can do them
The domain, the legal entity and the ICO registration — none of which are
credentials. See the launch guide for the ordering and costs.
