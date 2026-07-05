-- ═══════════════════════════════════════════════════════════════════════
-- 0010 — Payment schedule.
--
-- Couples split payments across many vendors (deposit now, balance later,
-- final on the day). This is a forward-looking SCHEDULE of instalments with
-- due dates and reminders — distinct from the existing `payments` table,
-- which records money already paid against a budget line.
--
-- Each scheduled payment belongs to a vendor and may link to a budget line.
-- Marking one paid bumps the linked budget line's paid_amount (kept in the
-- server action so the link is explicit and auditable), so the payment
-- schedule and the budget always agree.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists vendor_payments (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  vendor_id uuid references vendors(id) on delete set null,
  budget_item_id uuid references budget_items(id) on delete set null,
  label text not null,                  -- "Deposit", "Balance", "Final payment"
  amount int not null,                  -- pence
  due_date date not null,
  status text not null default 'scheduled',   -- scheduled | paid
  paid_on date,
  method text,                          -- bank transfer | card | cash
  remind_days_before int not null default 7,
  reminded_at timestamptz,              -- set once a reminder email has gone out
  note text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint vendor_payments_status_chk check (status in ('scheduled', 'paid'))
);

create index if not exists vendor_payments_site_due_idx on vendor_payments (site_id, due_date) where archived_at is null;
create index if not exists vendor_payments_vendor_idx on vendor_payments (vendor_id);

-- Site-scoped RLS, same shape as every other tenant table.
alter table vendor_payments enable row level security;

drop policy if exists vendor_payments_read on vendor_payments;
create policy vendor_payments_read on vendor_payments
  for select using (can_access_site(site_id));

drop policy if exists vendor_payments_write on vendor_payments;
create policy vendor_payments_write on vendor_payments
  for all using (can_write_site(site_id)) with check (can_write_site(site_id));
