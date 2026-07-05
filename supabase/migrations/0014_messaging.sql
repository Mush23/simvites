-- ═══════════════════════════════════════════════════════════════════════
-- 0014 — Two-way guest messaging (SMS / WhatsApp).
--
-- One thread per household. Outbound messages go via Twilio (guarded);
-- inbound replies arrive on the Twilio webhook, are matched to a guest by
-- phone number, and land in the same thread — so the whole conversation
-- lives in one place instead of scattered group chats.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  guest_id uuid references guests(id) on delete set null,
  direction text not null,               -- out | in
  channel text not null default 'sms',   -- sms | whatsapp
  body text not null,
  address text,                          -- the guest's phone number (E.164)
  provider_sid text,                     -- Twilio message SID (idempotency)
  status text,                           -- queued | sent | delivered | received | failed
  created_at timestamptz not null default now(),
  constraint messages_direction_chk check (direction in ('out', 'in')),
  constraint messages_channel_chk check (channel in ('sms', 'whatsapp'))
);

create index if not exists messages_site_household_idx on messages (site_id, household_id, created_at);
create unique index if not exists messages_provider_sid_uidx on messages (provider_sid) where provider_sid is not null;

alter table messages enable row level security;

drop policy if exists messages_read on messages;
create policy messages_read on messages
  for select using (can_access_site(site_id));

drop policy if exists messages_write on messages;
create policy messages_write on messages
  for all using (can_write_site(site_id)) with check (can_write_site(site_id));
-- Inbound webhook writes run service-role (bypass RLS), like other webhooks.
