# Connecting Simvites to its services

A plain-English checklist of every external service, what it's for, where to get
the credential, and where it goes. Secrets live in **`.env.local`** (gitignored —
never committed). You hand me each value once; I wire it in and run everything.

Status legend: ✅ connected · ⏳ needed now · 🔜 later phase

---

## ✅ GitHub — source control
- **Repo:** https://github.com/Mush23/simvites (private)
- **Auth:** `gh` CLI, logged in as `Mush23`. Nothing more to do.

## ✅ Supabase — database, storage, auth (project `rpkcrazictrjuxheugod`)
Already in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — `https://rpkcrazictrjuxheugod.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your **publishable** key (browser, safe)
- `SUPABASE_SERVICE_ROLE_KEY` — your **secret** key (server only)

### ⏳ DATABASE_URL — needed now, to create the tables
The API keys above can read/write data but can't *create tables*. For that I need
the Postgres connection string (it contains the database password).

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

## 🔜 Resend — invite & RSVP emails (Phase 4)
- Sign up at resend.com → **API Keys** → create one (`re_…`).
- Add your sending domain and the DNS records Resend shows (SPF/DKIM).
- Give me the key → goes to `RESEND_API_KEY`.

## 🔜 Stripe — payments (Phase 5)
- Stripe dashboard (test mode) → **Developers → API keys**: publishable (`pk_…`)
  and secret (`sk_…`).
- After I add the webhook endpoint, **Developers → Webhooks** gives a signing
  secret (`whsec_…`).
- Give me all three → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`.

## 🔜 Vercel — hosting + wildcard/custom domains (at deploy)
- Connect the GitHub repo at vercel.com (free Hobby for dev; Pro at commercial
  launch, required for commercial use + wildcard domains).
- For `*.simvites.co.uk`: add the domain in Vercel and set the DNS wildcard
  record at your registrar. Custom-domain add-on uses the Vercel Domains API
  (token → `VERCEL_API_TOKEN`), wired in a later phase.

---

### What I run once DATABASE_URL is set
```bash
npm run db:apply    # all migrations + Template #1 seed
npm run db:verify   # confirms tables, RLS, seeded template
```
Then Phase 1 begins: Supabase Auth → dashboard → create-site-from-template.
