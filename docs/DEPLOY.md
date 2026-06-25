# Deploying Simvites to Vercel

Two ways to deploy. **Dashboard** is easiest for a one-time setup; **CLI** lets
me drive it if you give me a token.

---

## Environment variables (set these in Vercel → Project → Settings → Env Vars)

Production values (Preview/Production scope):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rpkcrazictrjuxheugod.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your `sb_publishable_…` key |
| `SUPABASE_SERVICE_ROLE_KEY` | your `sb_secret_…` key |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `simvites.co.uk` (once the domain is attached) |
| `GUEST_SESSION_SECRET` | a long random string (e.g. `openssl rand -base64 32`) |
| `RESEND_API_KEY` | optional, when email is connected |
| `RESEND_FROM` | optional, e.g. `Simvites <invitations@simvites.co.uk>` |
| `STRIPE_SECRET_KEY` | optional, when payments are connected |
| `STRIPE_WEBHOOK_SECRET` | optional (set after creating the webhook) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | optional |

`DATABASE_URL` is **not** needed on Vercel — it's only used by the local
migration scripts.

---

## Option A — Vercel dashboard (recommended, one-time)

1. Go to vercel.com → **Add New… → Project** → import **Mush23/simvites**
   (authorise GitHub if asked). Vercel auto-detects Next.js — no settings to change.
2. Before the first deploy, add the env vars above.
3. Deploy. You get `https://simvites.vercel.app` (marketing + dashboard + login work here).
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

## Wildcard domain `*.simvites.co.uk` (enables real tenant subdomains)

Needed so `couplename.simvites.co.uk` works in production (Vercel Pro required
for commercial use + wildcard domains).

1. Vercel → Project → **Settings → Domains** → add `simvites.co.uk` **and**
   `*.simvites.co.uk`.
2. At your domain registrar, add the DNS records Vercel shows:
   - `simvites.co.uk` → A/ALIAS to Vercel
   - `*.simvites.co.uk` → CNAME to `cname.vercel-dns.com`
3. Set `NEXT_PUBLIC_ROOT_DOMAIN=simvites.co.uk` and redeploy.
4. `proxy.ts` then resolves any `<slug>.simvites.co.uk` → the tenant site.

> Until the domain is attached, the app is fully usable at `*.vercel.app` for the
> marketing site, dashboard and editor; only public tenant subdomains need the
> wildcard.

---

## After deploy — register webhooks

- **Stripe** → Developers → Webhooks → add `https://<your-domain>/api/webhooks/stripe`,
  copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
- **Resend** → Webhooks → add `https://<your-domain>/api/webhooks/resend`.
