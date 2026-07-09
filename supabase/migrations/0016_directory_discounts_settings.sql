-- E4/E5 (founder review): the vendor directory becomes founder-manageable
-- (until now new suppliers required SQL), with partner discounts couples can
-- actually redeem; and platform pricing moves out of a code constant into a
-- settings table the admin console can edit.

alter table public.vendor_directory
  add column if not exists discount text,
  add column if not exists promo_code text;

-- Key/value platform settings. RLS on with no policies = service-role only;
-- reads happen through server code, never the browser.
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;

-- Seed the current price so the checkout keeps working the moment code reads it.
insert into public.platform_settings (key, value)
values ('unlock_price', '{"amount": 14900, "currency": "gbp", "label": "Wedding package"}')
on conflict (key) do nothing;
