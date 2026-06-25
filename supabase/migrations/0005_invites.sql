-- ─────────────────────────────────────────────────────────────────────────
-- Phase 4 — invite delivery. Households gain an optional contact email (for
-- Resend). Personalised links carry a hashed token (no schema change needed —
-- invitations already store token_hash). Recipients/batches/webhook idempotency
-- tables already exist from 0001.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.households add column if not exists email text;
