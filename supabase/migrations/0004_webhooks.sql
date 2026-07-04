-- ═══════════════════════════════════════════════════════════════════════
-- 0004 — webhook idempotency. Providers (Stripe, later Resend) redeliver
-- events; each is recorded once here and duplicates short-circuit.
-- Platform-level table: RLS enabled with NO policies → service role only.
-- ═══════════════════════════════════════════════════════════════════════

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,               -- 'stripe' | 'resend' | …
  provider_event_id text not null,
  payload jsonb not null default '{}',
  processed_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

alter table webhook_events enable row level security;
-- no policies on purpose: only the service role (bypasses RLS) touches this.
